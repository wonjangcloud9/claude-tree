import { Command } from 'commander';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import {
  GitWorktreeAdapter,
  ClaudeSessionAdapter,
  FileSessionRepository,
  FileEventRepository,
  FileToolApprovalRepository,
  GitHubAdapter,
  type ClaudeOutputEvent,
} from '@claudetree/core';
import type { Session, Issue, EventType } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface StartOptions {
  prompt?: string;
  noSession: boolean;
  skill?: string;
  branch?: string;
  token?: string;
}

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
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export const startCommand = new Command('start')
  .description('Create worktree from issue and start Claude session')
  .argument('<issue>', 'Issue number, GitHub URL, or task name')
  .option('-p, --prompt <prompt>', 'Initial prompt for Claude')
  .option('--no-session', 'Create worktree without starting Claude')
  .option('-s, --skill <skill>', 'Skill to activate (tdd, review)')
  .option('-b, --branch <branch>', 'Custom branch name')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .action(async (issue: string, options: StartOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    let issueNumber: number | null = null;
    let issueData: Issue | null = null;
    let branchName: string;

    // Check if it's a GitHub URL
    const ghToken = options.token ?? process.env.GITHUB_TOKEN ?? config.github?.token;

    if (issue.includes('github.com')) {
      // Parse GitHub URL
      if (!ghToken) {
        console.error('Error: GitHub token required for URL. Set GITHUB_TOKEN or use --token.');
        process.exit(1);
      }

      const ghAdapter = new GitHubAdapter(ghToken);
      const parsed = ghAdapter.parseIssueUrl(issue);

      if (!parsed) {
        console.error('Error: Invalid GitHub URL format.');
        process.exit(1);
      }

      console.log(`Fetching issue #${parsed.number} from ${parsed.owner}/${parsed.repo}...`);

      try {
        issueData = await ghAdapter.getIssue(parsed.owner, parsed.repo, parsed.number);
        issueNumber = issueData.number;
        branchName = options.branch ?? ghAdapter.generateBranchName(issueNumber, issueData.title);

        console.log(`  Title: ${issueData.title}`);
        console.log(`  Labels: ${issueData.labels.join(', ') || 'none'}`);
      } catch (error) {
        console.error(`Error: Failed to fetch issue. ${error instanceof Error ? error.message : ''}`);
        process.exit(1);
      }
    } else {
      // Parse as issue number or task name
      const parsed = parseInt(issue, 10);
      const isNumber = !isNaN(parsed);

      if (isNumber && ghToken && config.github?.owner && config.github?.repo) {
        // Try to fetch issue from configured repo
        const ghAdapter = new GitHubAdapter(ghToken);
        try {
          console.log(`Fetching issue #${parsed}...`);
          issueData = await ghAdapter.getIssue(config.github.owner, config.github.repo, parsed);
          issueNumber = issueData.number;
          branchName = options.branch ?? ghAdapter.generateBranchName(issueNumber, issueData.title);

          console.log(`  Title: ${issueData.title}`);
        } catch {
          // Fall back to simple issue number
          issueNumber = parsed;
          branchName = options.branch ?? `issue-${issueNumber}`;
        }
      } else if (isNumber) {
        issueNumber = parsed;
        branchName = options.branch ?? `issue-${issueNumber}`;
      } else {
        branchName = options.branch ?? `task-${issue}`;
      }
    }

    const worktreePath = join(cwd, config.worktreeDir, branchName);

    // Check if worktree already exists
    const gitAdapter = new GitWorktreeAdapter(cwd);
    const existingWorktrees = await gitAdapter.list();
    const existingWorktree = existingWorktrees.find(
      (wt) => wt.branch === branchName || wt.path.endsWith(branchName)
    );

    let worktree: { id: string; path: string; branch: string };

    if (existingWorktree) {
      console.log(`\nUsing existing worktree: ${branchName}`);
      worktree = {
        id: randomUUID(),
        path: existingWorktree.path,
        branch: existingWorktree.branch,
      };
      console.log(`  Branch: ${worktree.branch}`);
      console.log(`  Path: ${worktree.path}`);
    } else {
      console.log(`\nCreating worktree: ${branchName}`);

      try {
        worktree = await gitAdapter.create({
          path: worktreePath,
          branch: branchName,
          issueNumber: issueNumber ?? undefined,
        });

        console.log(`  Branch: ${worktree.branch}`);
        console.log(`  Path: ${worktree.path}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    }

    try {

      if (options.noSession) {
        console.log('\nWorktree created. Use "cd" to navigate and start working.');
        return;
      }

      // Check Claude availability
      const claudeAdapter = new ClaudeSessionAdapter();
      const available = await claudeAdapter.isClaudeAvailable();

      if (!available) {
        console.error('\nError: Claude CLI not found. Install it first.');
        console.log('Worktree created but Claude session not started.');
        return;
      }

      // Create session record
      const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));
      const session: Session = {
        id: randomUUID(),
        worktreeId: worktree.id,
        claudeSessionId: null,
        status: 'pending',
        issueNumber,
        prompt: options.prompt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await sessionRepo.save(session);

      // Build prompt
      let prompt: string;
      if (options.prompt) {
        prompt = options.prompt;
      } else if (issueData) {
        prompt = `You are working on Issue #${issueNumber}: "${issueData.title}"

Issue Description:
${issueData.body || 'No description provided.'}

IMPORTANT: Do NOT just analyze or suggest. Actually IMPLEMENT the solution.

Workflow:
1. Read the relevant code files
2. Write the code to solve this issue
3. Run tests to verify your implementation
4. When done, commit your changes with a clear message
5. Create a PR to the develop branch

Start implementing now.`;
      } else if (issueNumber) {
        prompt = `Working on issue #${issueNumber}. Implement the solution - do not just analyze.`;
      } else {
        prompt = `Working on ${branchName}. Implement any required changes.`;
      }

      // Add skill if specified
      let systemPrompt: string | undefined;
      if (options.skill === 'tdd') {
        systemPrompt = 'Follow TDD workflow: write failing test first, then implement, then refactor.';
      } else if (options.skill === 'review') {
        systemPrompt = 'Review code thoroughly for security, quality, and best practices.';
      }

      console.log('\nStarting Claude session...');
      if (systemPrompt) {
        console.log(`  Skill: ${options.skill}`);
      }

      // Initialize event repositories
      const eventRepo = new FileEventRepository(join(cwd, CONFIG_DIR));
      const approvalRepo = new FileToolApprovalRepository(join(cwd, CONFIG_DIR));

      // Setup event listener for recording
      claudeAdapter.on('output', async (event: ClaudeOutputEvent) => {
        const { output } = event;

        // Map Claude output type to event type
        let eventType: EventType = 'output';
        if (output.type === 'tool_use') {
          eventType = 'tool_call';

          // Record tool approval request
          try {
            const parsed = parseToolCall(output.content);
            if (parsed) {
              await approvalRepo.save({
                id: randomUUID(),
                sessionId: session.id,
                toolName: parsed.toolName,
                parameters: parsed.parameters,
                status: 'approved', // Auto-approved for now
                approvedBy: 'auto',
                requestedAt: output.timestamp,
                resolvedAt: output.timestamp,
              });
            }
          } catch {
            // Ignore parse errors
          }
        } else if (output.type === 'error') {
          eventType = 'error';
        }

        // Record event
        try {
          await eventRepo.append({
            id: randomUUID(),
            sessionId: session.id,
            type: eventType,
            content: output.content,
            timestamp: output.timestamp,
          });
        } catch {
          // Ignore file write errors
        }
      });

      // Start Claude session
      console.log('\n\x1b[33m[Debug]\x1b[0m Starting Claude process...');
      console.log(`\x1b[33m[Debug]\x1b[0m Prompt: ${prompt.slice(0, 100)}...`);

      const result = await claudeAdapter.start({
        workingDir: worktree.path,
        prompt,
        systemPrompt,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
      });

      console.log(`\x1b[33m[Debug]\x1b[0m Process started with ID: ${result.processId.slice(0, 8)}`);

      // Update session
      session.status = 'running';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      console.log(`\nSession started: ${session.id.slice(0, 8)}`);
      console.log(`Working directory: ${worktree.path}`);
      console.log('Claude is now working on the issue...\n');
      console.log('\x1b[33m[Debug]\x1b[0m Waiting for Claude output...\n');

      // Wait for Claude to complete and show output
      let outputCount = 0;
      for await (const output of claudeAdapter.getOutput(result.processId)) {
        outputCount++;
        console.log(`\x1b[33m[Debug]\x1b[0m Received output #${outputCount}: type=${output.type}`);

        if (output.type === 'text') {
          console.log(output.content);
        } else if (output.type === 'tool_use') {
          console.log(`\x1b[36m[Tool]\x1b[0m ${output.content}`);
        } else if (output.type === 'error') {
          console.error(`\x1b[31m[Error]\x1b[0m ${output.content}`);
        } else if (output.type === 'done') {
          console.log(`\x1b[32m[Done]\x1b[0m Session ID: ${output.content}`);
        }
      }

      console.log(`\x1b[33m[Debug]\x1b[0m Total outputs received: ${outputCount}`);

      // Session completed
      session.status = 'completed';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      console.log('\nSession completed.');

    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      }
      process.exit(1);
    }
  });

function parseToolCall(
  content: string
): { toolName: string; parameters: Record<string, unknown> } | null {
  // Format: "ToolName: {json}"
  const match = content.match(/^(\w+):\s*(.+)$/);
  if (!match) return null;

  try {
    return {
      toolName: match[1] ?? '',
      parameters: JSON.parse(match[2] ?? '{}'),
    };
  } catch {
    return null;
  }
}
