import { Command } from 'commander';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import {
  GitWorktreeAdapter,
  ClaudeSessionAdapter,
  FileSessionRepository,
  FileEventRepository,
  FileToolApprovalRepository,
  GitHubAdapter,
  TemplateLoader,
  DEFAULT_TEMPLATES,
  SlackNotifier,
  type ClaudeOutputEvent,
} from '@claudetree/core';
import type { Session, Issue, EventType, SessionTemplate, ProgressStep, SessionProgress } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface StartOptions {
  prompt?: string;
  noSession: boolean;
  skill?: string;
  branch?: string;
  token?: string;
  template?: string;
  maxCost?: number;
  lint?: string;
  gate?: boolean;
}

interface Config {
  worktreeDir: string;
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
  };
  slack?: {
    webhookUrl?: string;
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
  .option('-T, --template <template>', 'Session template (bugfix, feature, refactor, review)')
  .option('-b, --branch <branch>', 'Custom branch name')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .option('--max-cost <cost>', 'Maximum cost in USD (stops session if exceeded)', parseFloat)
  .option('--lint <command>', 'Lint command to run after Claude completes (e.g., "npm run lint")')
  .option('--gate', 'Fail session if lint fails', false)
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
        // Recovery fields
        processId: null,
        osProcessId: null,
        lastHeartbeat: null,
        errorCount: 0,
        worktreePath: worktree.path,
        // Token usage
        usage: null,
        // Progress tracking
        progress: {
          currentStep: 'analyzing',
          completedSteps: [],
          startedAt: new Date(),
        },
      };

      await sessionRepo.save(session);

      // Load template if specified
      let template: SessionTemplate | null = null;
      if (options.template) {
        const templateLoader = new TemplateLoader(join(cwd, CONFIG_DIR));
        template = await templateLoader.load(options.template);

        // Fall back to default templates
        if (!template && options.template in DEFAULT_TEMPLATES) {
          template = DEFAULT_TEMPLATES[options.template] ?? null;
        }

        if (!template) {
          console.error(`Error: Template "${options.template}" not found.`);
          console.log('Available templates: bugfix, feature, refactor, review');
          process.exit(1);
        }

        console.log(`  Template: ${template.name}`);
      }

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

      // Apply template to prompt
      if (template) {
        const prefix = template.promptPrefix ? `${template.promptPrefix}\n\n` : '';
        const suffix = template.promptSuffix ? `\n\n${template.promptSuffix}` : '';
        prompt = `${prefix}${prompt}${suffix}`;
      }

      // Add skill if specified (template skill takes precedence)
      let systemPrompt: string | undefined;
      const effectiveSkill = template?.skill || options.skill;

      if (effectiveSkill === 'tdd') {
        systemPrompt = `You MUST follow strict TDD (Test-Driven Development):

1. RED: Write a failing test FIRST - never write implementation before tests
2. GREEN: Write MINIMUM code to pass the test - no extra features
3. REFACTOR: Clean up while keeping tests green

Rules:
- One test at a time
- Commit after each phase: "test: ...", "feat: ...", "refactor: ..."
- Run tests after every change
- Create PR only when all tests pass`;
      } else if (effectiveSkill === 'review') {
        systemPrompt = 'Review code thoroughly for security, quality, and best practices.';
      }

      // Template system prompt overrides
      if (template?.systemPrompt) {
        systemPrompt = template.systemPrompt;
      }

      console.log('\nStarting Claude session...');
      if (effectiveSkill) {
        console.log(`  Skill: ${effectiveSkill}`);
      }
      if (options.maxCost) {
        console.log(`  \x1b[33mBudget limit: $${options.maxCost.toFixed(2)}\x1b[0m`);
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

          // Record tool approval request and update progress
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

              // Update progress based on tool usage
              if (session.progress) {
                const detectedStep = detectProgressStep(parsed.toolName, parsed.parameters);
                if (detectedStep) {
                  session.progress = updateProgress(session.progress, detectedStep);
                  await sessionRepo.save(session);
                }
              }
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
      const result = await claudeAdapter.start({
        workingDir: worktree.path,
        prompt,
        systemPrompt,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
      });

      // Update session with process info
      session.processId = result.processId;
      session.osProcessId = result.osProcessId;
      session.lastHeartbeat = new Date();
      session.status = 'running';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      // Setup graceful shutdown
      const handleShutdown = async () => {
        console.log('\n[Info] Pausing session...');
        session.status = 'paused';
        session.updatedAt = new Date();
        await sessionRepo.save(session);
        console.log(`Session paused: ${session.id.slice(0, 8)}`);
        if (session.claudeSessionId) {
          console.log(`Resume with: claudetree resume ${session.id.slice(0, 8)}`);
        }
        process.exit(0);
      };

      process.on('SIGINT', handleShutdown);
      process.on('SIGTERM', handleShutdown);

      console.log(`\nSession started: ${session.id.slice(0, 8)}`);
      console.log(`Working directory: ${worktree.path}`);
      console.log('Claude is now working on the issue...\n');

      // Wait for Claude to complete and show output
      let outputCount = 0;
      let currentCost = 0;
      let budgetExceeded = false;

      for await (const output of claudeAdapter.getOutput(result.processId)) {
        outputCount++;
        session.lastHeartbeat = new Date();

        // Track cumulative cost from system events
        if (output.cumulativeCost !== undefined) {
          currentCost = output.cumulativeCost;

          // Budget check
          if (options.maxCost && currentCost >= options.maxCost && !budgetExceeded) {
            budgetExceeded = true;
            console.log(`\x1b[31m[Budget]\x1b[0m Cost $${currentCost.toFixed(4)} exceeded limit $${options.maxCost.toFixed(4)}. Stopping session...`);
            await claudeAdapter.stop(result.processId);
            session.status = 'failed';
            session.updatedAt = new Date();
            await sessionRepo.save(session);
            break;
          }
        }

        if (output.type === 'text') {
          console.log(output.content);
        } else if (output.type === 'tool_use') {
          console.log(`\x1b[36m[Tool]\x1b[0m ${output.content}`);
        } else if (output.type === 'error') {
          console.error(`\x1b[31m[Error]\x1b[0m ${output.content}`);
        } else if (output.type === 'done') {
          console.log(`\x1b[32m[Done]\x1b[0m Session ID: ${output.content}`);
          // Capture Claude session ID for resume
          if (output.content) {
            session.claudeSessionId = output.content;
          }
          // Capture token usage
          if (output.usage) {
            session.usage = output.usage;
            console.log(`\x1b[32m[Usage]\x1b[0m Tokens: ${output.usage.inputTokens} in / ${output.usage.outputTokens} out | Cost: $${output.usage.totalCostUsd.toFixed(4)}`);
          }
        }

        // Update heartbeat periodically
        if (outputCount % 10 === 0) {
          session.updatedAt = new Date();
          await sessionRepo.save(session);
        }
      }

      // Skip to end if budget was exceeded
      if (budgetExceeded) {
        console.log('\nSession stopped due to budget limit.');
      } else {
        // Session completed
        session.status = 'completed';
        session.updatedAt = new Date();
        await sessionRepo.save(session);

        console.log('\nSession completed.');

        // Run lint gate
        if (options.lint) {
          console.log('\n\x1b[36m[Gate]\x1b[0m Running lint check...\n');
          console.log(`  \x1b[33mLint:\x1b[0m ${options.lint}`);
          try {
            execSync(options.lint, { cwd: worktree.path, stdio: 'inherit' });
            console.log('  \x1b[32m✓ Lint passed\x1b[0m\n');
          } catch {
            console.log('  \x1b[31m✗ Lint failed\x1b[0m\n');
            if (options.gate) {
              console.log('\x1b[31m[Gate]\x1b[0m Session failed lint check.');
              session.status = 'failed';
              session.updatedAt = new Date();
              await sessionRepo.save(session);
            }
          }
        }
      }

      // Send Slack notification
      if (config.slack?.webhookUrl) {
        const slack = new SlackNotifier(config.slack.webhookUrl);
        await slack.notifySession({
          sessionId: session.id,
          status: 'completed',
          issueNumber,
          branch: branchName,
          worktreePath: worktree.path,
          duration: Date.now() - session.createdAt.getTime(),
        });
      }

    } catch (error) {
      // Send failure notification
      if (config.slack?.webhookUrl) {
        const slack = new SlackNotifier(config.slack.webhookUrl);
        await slack.notifySession({
          sessionId: 'unknown',
          status: 'failed',
          issueNumber,
          branch: branchName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

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

function detectProgressStep(toolName: string, params: Record<string, unknown>): ProgressStep | null {
  const command = String(params.command ?? '');

  // Detect test running
  if (toolName === 'Bash') {
    if (command.includes('test') || command.includes('jest') || command.includes('vitest') || command.includes('pytest')) {
      return 'testing';
    }
    if (command.includes('git commit')) {
      return 'committing';
    }
    if (command.includes('gh pr create') || command.includes('git push')) {
      return 'creating_pr';
    }
  }

  // Detect code writing
  if (toolName === 'Edit' || toolName === 'Write') {
    return 'implementing';
  }

  // Detect code reading/analysis
  if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
    return 'analyzing';
  }

  return null;
}

function updateProgress(
  progress: SessionProgress,
  newStep: ProgressStep
): SessionProgress {
  const stepOrder: ProgressStep[] = ['analyzing', 'implementing', 'testing', 'committing', 'creating_pr'];
  const currentIdx = stepOrder.indexOf(progress.currentStep);
  const newIdx = stepOrder.indexOf(newStep);

  // Only advance forward, don't go backwards
  if (newIdx > currentIdx) {
    // Mark all steps between current and new as completed
    const completed = new Set(progress.completedSteps);
    for (let i = 0; i <= currentIdx; i++) {
      completed.add(stepOrder[i]!);
    }
    return {
      ...progress,
      currentStep: newStep,
      completedSteps: Array.from(completed),
    };
  }

  return progress;
}
