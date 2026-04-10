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
      },
    },
    async ({ label, limit, parallel, template, dryRun, retry, sequential, tags }) => {
      const args = ['auto'];
      if (label) args.push('--label', label);
      if (limit) args.push('--limit', String(limit));
      if (parallel) args.push('--parallel', String(parallel));
      if (template) args.push('--template', template);
      if (dryRun) args.push('--dry-run');
      if (retry) args.push('--retry', String(retry));
      if (sequential) args.push('--sequential');
      if (tags?.length) args.push('--tag', ...tags);

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
}
