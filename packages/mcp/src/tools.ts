import { z } from 'zod';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  FileSessionRepository,
  FileEventRepository,
  ClaudeSessionAdapter,
} from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface Config {
  worktreeDir: string;
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
  };
}

async function loadConfig(cwd: string): Promise<Config | null> {
  try {
    const configPath = join(cwd, CONFIG_DIR, 'config.json');
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as Config;
  } catch {
    return null;
  }
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function registerTools(server: McpServer): void {
  const cwd = process.env.CLAUDETREE_CWD ?? process.cwd();

  // ──────────────────────────────────────
  // ct_sessions_list - List all sessions
  // ──────────────────────────────────────
  server.registerTool(
    'ct_sessions_list',
    {
      description:
        'List all claudetree sessions with their status, issue number, cost, and progress',
      inputSchema: {
        status: z
          .enum(['all', 'running', 'completed', 'failed', 'paused', 'pending'])
          .optional()
          .describe('Filter by session status (default: all)'),
        tag: z
          .string()
          .optional()
          .describe('Filter sessions by tag'),
      },
    },
    async ({ status, tag }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();

      let filtered =
        !status || status === 'all'
          ? sessions
          : sessions.filter((s) => s.status === status);

      if (tag) {
        filtered = filtered.filter((s) => s.tags?.includes(tag));
      }

      if (filtered.length === 0) {
        return textResult('No sessions found.');
      }

      const lines = filtered.map((s) => {
        const issue = s.issueNumber ? `#${s.issueNumber}` : 'N/A';
        const cost = s.usage ? `$${s.usage.totalCostUsd.toFixed(4)}` : '-';
        const retry = s.retryCount > 0 ? ` (retries: ${s.retryCount})` : '';
        const tags = s.tags?.length ? ` [${s.tags.join(', ')}]` : '';
        return `${s.id.slice(0, 8)} | ${s.status} | Issue ${issue} | Cost ${cost}${retry}${tags}`;
      });

      return textResult(
        `Sessions (${filtered.length}):\n${lines.join('\n')}`,
      );
    },
  );

  // ──────────────────────────────────────
  // ct_session_detail - Get session detail
  // ──────────────────────────────────────
  server.registerTool(
    'ct_session_detail',
    {
      description:
        'Get detailed information about a specific claudetree session',
      inputSchema: {
        sessionId: z
          .string()
          .describe('Session ID (full or first 8 chars)'),
      },
    },
    async ({ sessionId }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();
      const session = sessions.find(
        (s) => s.id === sessionId || s.id.startsWith(sessionId),
      );

      if (!session) {
        return textResult(`Session "${sessionId}" not found.`);
      }

      const detail = [
        `ID: ${session.id}`,
        `Status: ${session.status}`,
        `Issue: ${session.issueNumber ?? 'N/A'}`,
        `Worktree: ${session.worktreePath ?? session.worktreeId}`,
        `Created: ${session.createdAt}`,
        `Updated: ${session.updatedAt}`,
      ];

      if (session.usage) {
        detail.push(
          `Tokens: ${session.usage.inputTokens} in / ${session.usage.outputTokens} out`,
          `Cost: $${session.usage.totalCostUsd.toFixed(4)}`,
        );
      }

      if (session.progress) {
        detail.push(
          `Step: ${session.progress.currentStep}`,
          `Completed: ${session.progress.completedSteps.join(', ') || 'none'}`,
        );
      }

      if (session.tags?.length) {
        detail.push(`Tags: ${session.tags.join(', ')}`);
      }

      if (session.retryCount > 0) {
        detail.push(`Retries: ${session.retryCount}`);
        if (session.lastError) {
          detail.push(`Last Error: ${session.lastError}`);
        }
      }

      // Check process health
      if (session.status === 'running' && session.osProcessId) {
        const adapter = new ClaudeSessionAdapter();
        const alive = adapter.isProcessAlive(session.osProcessId);
        detail.push(`Process: ${alive ? 'alive' : 'DEAD (zombie)'}`);
      }

      return textResult(detail.join('\n'));
    },
  );

  // ──────────────────────────────────────
  // ct_session_logs - Get session events
  // ──────────────────────────────────────
  server.registerTool(
    'ct_session_logs',
    {
      description: 'Get recent log events for a claudetree session',
      inputSchema: {
        sessionId: z.string().describe('Session ID (full or first 8 chars)'),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of recent events (default: 20)'),
      },
    },
    async ({ sessionId, limit }) => {
      const eventRepo = new FileEventRepository(join(cwd, CONFIG_DIR));
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();
      const session = sessions.find(
        (s) => s.id === sessionId || s.id.startsWith(sessionId),
      );

      if (!session) {
        return textResult(`Session "${sessionId}" not found.`);
      }

      const events = await eventRepo.findBySessionId(session.id);
      const recent = events.slice(-(limit ?? 20));

      if (recent.length === 0) {
        return textResult('No events found for this session.');
      }

      const lines = recent.map((e) => {
        const ts = new Date(e.timestamp).toLocaleTimeString();
        const content =
          e.content.length > 200
            ? e.content.slice(0, 200) + '...'
            : e.content;
        return `[${ts}] ${e.type}: ${content}`;
      });

      return textResult(lines.join('\n'));
    },
  );

  // ──────────────────────────────────────
  // ct_start - Start a new session
  // ──────────────────────────────────────
  server.registerTool(
    'ct_start',
    {
      description:
        'Start a new claudetree session for a GitHub issue (creates worktree + Claude session)',
      inputSchema: {
        issue: z
          .string()
          .describe('Issue number or GitHub issue URL'),
        template: z
          .enum(['bugfix', 'feature', 'refactor', 'review', 'docs'])
          .optional()
          .describe('Session template'),
        maxCost: z
          .number()
          .optional()
          .describe('Maximum cost in USD'),
        retry: z
          .number()
          .min(0)
          .max(5)
          .optional()
          .describe('Auto-retry count on failure'),
        noTdd: z
          .boolean()
          .optional()
          .describe('Disable TDD mode'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags for session organization'),
      },
    },
    async ({ issue, template, maxCost, retry, noTdd, tags }) => {
      const args = ['start', issue];
      if (template) args.push('--template', template);
      if (maxCost) args.push('--max-cost', String(maxCost));
      if (retry) args.push('--retry', String(retry));
      if (noTdd) args.push('--no-tdd');
      if (tags?.length) args.push('--tag', ...tags);

      const proc = spawn('claudetree', args, {
        cwd,
        stdio: 'ignore',
        detached: true,
      });
      proc.unref();

      return textResult(
        `Session starting for issue ${issue} (PID: ${proc.pid ?? 'unknown'}).\nUse ct_sessions_list to monitor progress.`,
      );
    },
  );

  // ──────────────────────────────────────
  // ct_bustercall - Auto-fetch and process issues
  // ──────────────────────────────────────
  server.registerTool(
    'ct_bustercall',
    {
      description:
        'Auto-fetch open GitHub issues, detect conflicts, and start parallel Claude sessions (bustercall/auto)',
      inputSchema: {
        label: z.string().optional().describe('Filter by GitHub label'),
        limit: z.number().min(1).max(50).optional().describe('Max issues to process (default: 10)'),
        parallel: z.number().min(1).max(10).optional().describe('Parallel session count (default: 3)'),
        template: z
          .enum(['bugfix', 'feature', 'refactor', 'review', 'docs'])
          .optional()
          .describe('Session template'),
        dryRun: z.boolean().optional().describe('Show plan without executing'),
        retry: z.number().min(0).max(5).optional().describe('Auto-retry failed sessions'),
        sequential: z.boolean().optional().describe('Force sequential execution'),
        tags: z.array(z.string()).optional().describe('Tags for sessions'),
        resume: z.string().optional().describe('Resume a previous batch (retry failed sessions by batch ID)'),
        sort: z.enum(['priority', 'newest', 'oldest']).optional().describe('Sort issues before processing'),
        review: z.boolean().optional().describe('Auto-review after each session (Writer/Reviewer pattern)'),
      },
    },
    async ({ label, limit, parallel, template, dryRun, retry, sequential, tags, resume, sort, review }) => {
      const args = ['auto'];
      if (label) args.push('--label', label);
      if (limit) args.push('--limit', String(limit));
      if (parallel) args.push('--parallel', String(parallel));
      if (template) args.push('--template', template);
      if (dryRun) args.push('--dry-run');
      if (retry) args.push('--retry', String(retry));
      if (sequential) args.push('--sequential');
      if (tags?.length) args.push('--tag', ...tags);
      if (resume) args.push('--resume', resume);
      if (sort) args.push('--sort', sort);
      if (review) args.push('--review');

      const proc = spawn('claudetree', args, {
        cwd,
        stdio: 'ignore',
        detached: true,
      });
      proc.unref();

      const mode = dryRun ? 'Dry run' : 'Bustercall';
      return textResult(
        `${mode} started (PID: ${proc.pid ?? 'unknown'}).\nLabel: ${label ?? 'all'}, Limit: ${limit ?? 10}, Parallel: ${parallel ?? 3}\nUse ct_sessions_list to monitor progress.`,
      );
    },
  );

  // ──────────────────────────────────────
  // ct_pr - Create PRs from sessions
  // ──────────────────────────────────────
  server.registerTool(
    'ct_pr',
    {
      description:
        'Create pull requests from completed claudetree sessions with auto-generated descriptions',
      inputSchema: {
        sessionId: z.string().optional().describe('Specific session ID (or creates for all completed)'),
        base: z.string().optional().describe('Base branch (default: develop)'),
        dryRun: z.boolean().optional().describe('Preview PR without creating'),
        all: z.boolean().optional().describe('Create PRs for all completed sessions'),
      },
    },
    async ({ sessionId, base, dryRun, all }) => {
      const args = ['pr'];
      if (sessionId) args.push('--session', sessionId);
      if (base) args.push('--base', base);
      if (dryRun) args.push('--dry-run');
      if (all) args.push('--all');

      const proc = spawn('claudetree', args, {
        cwd,
        stdio: 'ignore',
        detached: true,
      });
      proc.unref();

      const target = sessionId ? `session ${sessionId}` : 'all completed sessions';
      const mode = dryRun ? 'PR preview' : 'PR creation';
      return textResult(
        `${mode} started for ${target} (PID: ${proc.pid ?? 'unknown'}).\nBase branch: ${base ?? 'develop'}`,
      );
    },
  );

  // ──────────────────────────────────────
  // ct_stop - Stop a running session
  // ──────────────────────────────────────
  server.registerTool(
    'ct_stop',
    {
      description: 'Stop a running claudetree session',
      inputSchema: {
        sessionId: z.string().describe('Session ID to stop'),
      },
    },
    async ({ sessionId }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();
      const session = sessions.find(
        (s) => s.id === sessionId || s.id.startsWith(sessionId),
      );

      if (!session) {
        return textResult(`Session "${sessionId}" not found.`);
      }

      if (session.status !== 'running') {
        return textResult(
          `Session ${sessionId} is not running (status: ${session.status}).`,
        );
      }

      if (session.osProcessId) {
        try {
          process.kill(session.osProcessId, 'SIGTERM');
        } catch {
          // Process may already be dead
        }
      }

      session.status = 'paused';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      return textResult(
        `Session ${session.id.slice(0, 8)} stopped and paused.`,
      );
    },
  );

  // ──────────────────────────────────────
  // ct_stats - Get cost analytics
  // ──────────────────────────────────────
  server.registerTool(
    'ct_stats',
    {
      description:
        'Get cost and token usage analytics across all sessions',
      inputSchema: {},
    },
    async () => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();

      const withUsage = sessions.filter((s) => s.usage);
      if (withUsage.length === 0) {
        return textResult('No sessions with usage data.');
      }

      let totalCost = 0;
      let totalInput = 0;
      let totalOutput = 0;
      const statusCounts: Record<string, number> = {};

      for (const s of sessions) {
        statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
        if (s.usage) {
          totalCost += s.usage.totalCostUsd;
          totalInput += s.usage.inputTokens;
          totalOutput += s.usage.outputTokens;
        }
      }

      const statusLine = Object.entries(statusCounts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      const lines = [
        `Total sessions: ${sessions.length} (${statusLine})`,
        `Total cost: $${totalCost.toFixed(4)}`,
        `Total tokens: ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out`,
        `Avg cost/session: $${(totalCost / withUsage.length).toFixed(4)}`,
      ];

      return textResult(lines.join('\n'));
    },
  );

  // ──────────────────────────────────────
  // ct_health - Check session health
  // ──────────────────────────────────────
  server.registerTool(
    'ct_health',
    {
      description:
        'Check health of running sessions and optionally recover zombie sessions',
      inputSchema: {
        fix: z
          .boolean()
          .optional()
          .describe('Auto-mark zombie sessions as failed (default: false)'),
      },
    },
    async ({ fix }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();
      const running = sessions.filter((s) => s.status === 'running');

      if (running.length === 0) {
        return textResult('No running sessions.');
      }

      const adapter = new ClaudeSessionAdapter();
      const results: string[] = [];
      let zombieCount = 0;

      for (const s of running) {
        if (!s.osProcessId) {
          results.push(`${s.id.slice(0, 8)}: unknown (no PID)`);
          continue;
        }

        const alive = adapter.isProcessAlive(s.osProcessId);
        if (alive) {
          results.push(`${s.id.slice(0, 8)}: healthy (PID ${s.osProcessId})`);
        } else {
          zombieCount++;
          if (fix) {
            s.status = 'failed';
            s.lastError = 'Process died (recovered by MCP health check)';
            s.updatedAt = new Date();
            await sessionRepo.save(s);
            results.push(`${s.id.slice(0, 8)}: ZOMBIE -> fixed (marked failed)`);
          } else {
            results.push(`${s.id.slice(0, 8)}: ZOMBIE (PID ${s.osProcessId} dead)`);
          }
        }
      }

      const summary =
        zombieCount > 0 && !fix
          ? `\n\n${zombieCount} zombie(s) found. Use fix=true to recover.`
          : '';

      return textResult(results.join('\n') + summary);
    },
  );

  // ──────────────────────────────────────
  // ct_config - Get project configuration
  // ──────────────────────────────────────
  server.registerTool(
    'ct_config',
    {
      description: 'Get claudetree project configuration',
      inputSchema: {},
    },
    async () => {
      const config = await loadConfig(cwd);
      if (!config) {
        return textResult(
          'claudetree not initialized. Run "claudetree init" first.',
        );
      }

      const lines = [
        `Working directory: ${cwd}`,
        `Worktree dir: ${config.worktreeDir}`,
        `GitHub: ${config.github?.owner ?? '-'}/${config.github?.repo ?? '-'}`,
      ];

      return textResult(lines.join('\n'));
    },
  );

  // ──────────────────────────────────────
  // ct_rerun - Rerun a session
  // ──────────────────────────────────────
  server.registerTool(
    'ct_rerun',
    {
      description: 'Rerun a failed or completed session with the same issue, optionally overriding template/tags',
      inputSchema: {
        sessionId: z.string().describe('Session ID to rerun (prefix match supported)'),
        template: z.enum(['bugfix', 'feature', 'refactor', 'review', 'docs']).optional().describe('Override session template'),
        keep: z.boolean().optional().describe('Keep the original session (default: delete it)'),
      },
    },
    async ({ sessionId, template, keep }) => {
      const args = ['rerun', sessionId];
      if (template) args.push('--template', template);
      if (keep) args.push('--keep');

      const proc = spawn('claudetree', args, { cwd, stdio: 'ignore', detached: true });
      proc.unref();

      return textResult(`Rerunning session ${sessionId} (PID: ${proc.pid ?? 'unknown'}).`);
    },
  );

  // ──────────────────────────────────────
  // ct_tag - Manage session tags
  // ──────────────────────────────────────
  server.registerTool(
    'ct_tag',
    {
      description: 'Add or remove tags from a session',
      inputSchema: {
        sessionId: z.string().describe('Session ID (prefix match supported)'),
        action: z.enum(['add', 'remove']).describe('Action: add or remove tags'),
        tags: z.array(z.string()).describe('Tags to add or remove'),
      },
    },
    async ({ sessionId, action, tags }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const sessions = await sessionRepo.findAll();
      const session = sessions.find(
        (s) => s.id === sessionId || s.id.startsWith(sessionId),
      );

      if (!session) {
        return textResult(`Session "${sessionId}" not found.`);
      }

      if (action === 'add') {
        const existing = new Set(session.tags ?? []);
        for (const tag of tags) existing.add(tag);
        session.tags = [...existing];
      } else {
        const toRemove = new Set(tags);
        session.tags = (session.tags ?? []).filter((t) => !toRemove.has(t));
      }

      await sessionRepo.save(session);
      return textResult(`Tags updated for ${session.id.slice(0, 8)}: [${session.tags.join(', ')}]`);
    },
  );

  // ──────────────────────────────────────
  // ct_cost - Cost analytics
  // ──────────────────────────────────────
  server.registerTool(
    'ct_cost',
    {
      description: 'Get cost analytics with daily breakdown and per-batch tracking',
      inputSchema: {
        days: z.number().min(1).max(90).optional().describe('Number of days to analyze (default: 7)'),
        batch: z.string().optional().describe('Filter by bustercall batch ID'),
      },
    },
    async ({ days, batch }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      let sessions = await sessionRepo.findAll();

      if (batch) {
        const batchTag = batch.startsWith('bustercall:') ? batch : `bustercall:${batch}`;
        sessions = sessions.filter((s) => s.tags?.includes(batchTag));
      }

      const numDays = days ?? 7;
      let totalCost = 0;
      let totalTokens = 0;
      let totalSessions = 0;
      const batchCosts = new Map<string, number>();

      for (const s of sessions) {
        if (!s.usage) continue;
        totalCost += s.usage.totalCostUsd;
        totalTokens += s.usage.inputTokens + s.usage.outputTokens;
        totalSessions++;

        const bt = s.tags?.find((t) => t.startsWith('bustercall:'));
        if (bt) batchCosts.set(bt, (batchCosts.get(bt) ?? 0) + s.usage.totalCostUsd);
      }

      const lines = [
        `Cost Analytics (${numDays} days):`,
        `Total cost: $${totalCost.toFixed(4)}`,
        `Total tokens: ${totalTokens.toLocaleString()}`,
        `Sessions with usage: ${totalSessions}`,
        totalSessions > 0 ? `Avg cost/session: $${(totalCost / totalSessions).toFixed(4)}` : '',
      ].filter(Boolean);

      if (batchCosts.size > 0) {
        lines.push('', 'Batch costs:');
        for (const [bt, cost] of batchCosts) {
          lines.push(`  ${bt}: $${cost.toFixed(4)}`);
        }
      }

      return textResult(lines.join('\n'));
    },
  );

  // ──────────────────────────────────────
  // ct_doctor - Environment health check
  // ──────────────────────────────────────
  server.registerTool(
    'ct_doctor',
    {
      description: 'Run environment diagnostics: check Node, Git, Claude CLI, GitHub auth, config, disk, stale sessions',
      inputSchema: {},
    },
    async () => {
      const args = ['doctor', '--json'];
      return new Promise((resolve) => {
        const proc = spawn('claudetree', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.on('close', () => {
          resolve(textResult(stdout || 'Doctor check completed (no output).'));
        });
        proc.on('error', () => {
          resolve(textResult('Failed to run ct doctor. Is claudetree installed?'));
        });
      });
    },
  );

  // ──────────────────────────────────────
  // ct_cleanup - Clean up sessions and worktrees
  // ──────────────────────────────────────
  server.registerTool(
    'ct_cleanup',
    {
      description: 'Clean up completed/failed sessions and orphaned worktrees',
      inputSchema: {
        dryRun: z.boolean().optional().describe('Preview cleanup without executing (default: true)'),
        status: z.enum(['completed', 'failed', 'all']).optional().describe('Filter by status (default: all)'),
      },
    },
    async ({ dryRun, status }) => {
      const args = ['cleanup'];
      if (dryRun !== false) args.push('--dry-run');
      if (status) args.push('--status', status);

      return new Promise((resolve) => {
        const proc = spawn('claudetree', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.on('close', () => {
          resolve(textResult(stdout || 'Cleanup completed.'));
        });
        proc.on('error', () => {
          resolve(textResult('Failed to run ct cleanup. Is claudetree installed?'));
        });
      });
    },
  );

  // ──────────────────────────────────────
  // ct_summary - Get work activity summary
  // ──────────────────────────────────────
  server.registerTool(
    'ct_summary',
    {
      description:
        'Generate a summary of session activity with success rate, cost analytics, and per-session details',
      inputSchema: {
        since: z
          .string()
          .optional()
          .describe('Time period: 24h, 7d, 30d (default: 24h)'),
        tag: z.string().optional().describe('Filter by tag'),
      },
    },
    async ({ since, tag }) => {
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      let sessions = await sessionRepo.findAll();

      // Time filter
      const sinceStr = since ?? '24h';
      const match = sinceStr.match(/^(\d+)([hdwm])$/);
      if (match) {
        const val = parseInt(match[1]!, 10);
        const unit = match[2]!;
        const msMap: Record<string, number> = {
          h: 3_600_000, d: 86_400_000, w: 604_800_000, m: 2_592_000_000,
        };
        const cutoff = Date.now() - val * (msMap[unit] ?? 86_400_000);
        sessions = sessions.filter(
          (s) => new Date(s.createdAt).getTime() >= cutoff,
        );
      }

      if (tag) {
        sessions = sessions.filter((s) => s.tags?.includes(tag));
      }

      if (sessions.length === 0) {
        return textResult('No sessions found in the specified period.');
      }

      const completed = sessions.filter((s) => s.status === 'completed').length;
      const failed = sessions.filter((s) => s.status === 'failed').length;
      const running = sessions.filter((s) => s.status === 'running').length;
      let totalCost = 0;
      let totalInput = 0;
      let totalOutput = 0;

      for (const s of sessions) {
        if (s.usage) {
          totalCost += s.usage.totalCostUsd;
          totalInput += s.usage.inputTokens;
          totalOutput += s.usage.outputTokens;
        }
      }

      const rate = Math.round((completed / sessions.length) * 100);

      const lines = [
        `Period: ${sinceStr}`,
        `Sessions: ${sessions.length} (${completed} completed, ${failed} failed, ${running} running)`,
        `Success rate: ${rate}%`,
        `Total cost: $${totalCost.toFixed(4)}`,
        `Tokens: ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out`,
      ];

      const issues = [...new Set(
        sessions.filter((s) => s.issueNumber).map((s) => `#${s.issueNumber}`),
      )];
      if (issues.length > 0) {
        lines.push(`Issues: ${issues.join(', ')}`);
      }

      return textResult(lines.join('\n'));
    },
  );
}
