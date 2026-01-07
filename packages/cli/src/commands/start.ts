import { Command } from 'commander';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
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
  ValidationGateRunner,
  type ClaudeOutputEvent,
} from '@claudetree/core';
import type {
  Session,
  Issue,
  EventType,
  SessionTemplate,
  ProgressStep,
  SessionProgress,
  TDDConfig,
  TDDSessionState,
  ValidationGate,
} from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface StartOptions {
  prompt?: string;
  noSession: boolean;
  tdd: boolean;  // default true, --no-tdd to disable
  skill?: string;
  branch?: string;
  token?: string;
  template?: string;
  maxCost?: number;
  timeout?: string;
  idleTimeout?: string;
  maxRetries?: string;
  gates?: string;
  testCommand?: string;
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

function parseGates(gatesStr: string, testCommand?: string): ValidationGate[] {
  const gateNames = gatesStr.split(',').map(g => g.trim().toLowerCase());
  const gates: ValidationGate[] = [];

  for (const name of gateNames) {
    switch (name) {
      case 'test':
        gates.push({ name: 'test', command: testCommand ?? 'pnpm test', required: true });
        break;
      case 'type':
        gates.push({ name: 'type', command: 'pnpm tsc --noEmit', required: true });
        break;
      case 'lint':
        gates.push({ name: 'lint', command: 'pnpm lint', required: false });
        break;
      case 'build':
        gates.push({ name: 'build', command: 'pnpm build', required: false });
        break;
    }
  }

  return gates;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export const startCommand = new Command('start')
  .description('Create worktree from issue and start Claude session (TDD mode by default)')
  .argument('<issue>', 'Issue number, GitHub URL, or task name')
  .option('-p, --prompt <prompt>', 'Initial prompt for Claude')
  .option('--no-session', 'Create worktree without starting Claude')
  .option('--no-tdd', 'Disable TDD mode (just implement without test-first)')
  .option('-s, --skill <skill>', 'Skill to activate (review)')
  .option('-T, --template <template>', 'Session template (bugfix, feature, refactor, review)')
  .option('-b, --branch <branch>', 'Custom branch name')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .option('--max-cost <cost>', 'Maximum cost in USD (stops session if exceeded)', parseFloat)
  .option('--timeout <minutes>', 'Total session timeout in minutes (default: 120)')
  .option('--idle-timeout <minutes>', 'Idle timeout in minutes (default: 10)')
  .option('--max-retries <n>', 'Max retries per validation gate (default: 3)')
  .option('--gates <gates>', 'Validation gates: test,type,lint,build (default: test,type)')
  .option('--test-command <cmd>', 'Custom test command (default: pnpm test)')
  .action(async (issue: string, options: StartOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    // Build TDD config if TDD mode enabled
    const tddEnabled = options.tdd !== false;
    let tddConfig: TDDConfig | null = null;

    if (tddEnabled) {
      tddConfig = {
        timeout: parseInt(options.timeout ?? '120', 10) * 60 * 1000,
        idleTimeout: parseInt(options.idleTimeout ?? '10', 10) * 60 * 1000,
        maxIterations: 10,
        maxRetries: parseInt(options.maxRetries ?? '3', 10),
        gates: parseGates(options.gates ?? 'test,type', options.testCommand),
      };
    }

    // Header
    if (tddEnabled) {
      console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
      console.log('\x1b[36m║         TDD Mode Session (Default)       ║\x1b[0m');
      console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
      console.log('\n\x1b[90mUse --no-tdd to disable TDD mode\x1b[0m\n');

      console.log('\x1b[33m⏱️  Time Limits:\x1b[0m');
      console.log(`   Session: ${formatDuration(tddConfig!.timeout)}`);
      console.log(`   Idle: ${formatDuration(tddConfig!.idleTimeout)}`);
      console.log(`   Max retries: ${tddConfig!.maxRetries}`);

      console.log('\n\x1b[33m✅ Validation Gates:\x1b[0m');
      for (const gate of tddConfig!.gates) {
        const status = gate.required ? '\x1b[31m(required)\x1b[0m' : '\x1b[90m(optional)\x1b[0m';
        console.log(`   • ${gate.name}: ${gate.command} ${status}`);
      }
    }

    let issueNumber: number | null = null;
    let issueData: Issue | null = null;
    let branchName: string;

    const ghToken = options.token ?? process.env.GITHUB_TOKEN ?? config.github?.token;

    if (issue.includes('github.com')) {
      if (!ghToken) {
        console.error('\nError: GitHub token required for URL. Set GITHUB_TOKEN or use --token.');
        process.exit(1);
      }

      const ghAdapter = new GitHubAdapter(ghToken);
      const parsed = ghAdapter.parseIssueUrl(issue);

      if (!parsed) {
        console.error('Error: Invalid GitHub URL format.');
        process.exit(1);
      }

      console.log(`\nFetching issue #${parsed.number} from ${parsed.owner}/${parsed.repo}...`);

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
      const parsed = parseInt(issue, 10);
      const isNumber = !isNaN(parsed);

      if (isNumber && ghToken && config.github?.owner && config.github?.repo) {
        const ghAdapter = new GitHubAdapter(ghToken);
        try {
          console.log(`\nFetching issue #${parsed}...`);
          issueData = await ghAdapter.getIssue(config.github.owner, config.github.repo, parsed);
          issueNumber = issueData.number;
          branchName = options.branch ?? ghAdapter.generateBranchName(issueNumber, issueData.title);

          console.log(`  Title: ${issueData.title}`);
        } catch {
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

      const claudeAdapter = new ClaudeSessionAdapter();
      const available = await claudeAdapter.isClaudeAvailable();

      if (!available) {
        console.error('\nError: Claude CLI not found. Install it first.');
        console.log('Worktree created but Claude session not started.');
        return;
      }

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
        processId: null,
        osProcessId: null,
        lastHeartbeat: null,
        errorCount: 0,
        worktreePath: worktree.path,
        usage: null,
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
${tddEnabled ? '\nStart with TDD - write a failing test first!' : ''}`;
      } else if (issueNumber) {
        prompt = `Working on issue #${issueNumber}. ${tddEnabled ? 'Start with TDD - write a failing test first!' : 'Implement the solution.'}`;
      } else {
        prompt = `Working on ${branchName}. ${tddEnabled ? 'Start with TDD - write a failing test first!' : 'Implement any required changes.'}`;
      }

      if (template) {
        const prefix = template.promptPrefix ? `${template.promptPrefix}\n\n` : '';
        const suffix = template.promptSuffix ? `\n\n${template.promptSuffix}` : '';
        prompt = `${prefix}${prompt}${suffix}`;
      }

      // Build system prompt
      let systemPrompt: string | undefined;
      const effectiveSkill = template?.skill || options.skill;

      if (tddEnabled) {
        // TDD system prompt (default)
        systemPrompt = `You are in TDD (Test-Driven Development) mode. Follow this STRICT workflow:

## TDD Cycle (Repeat until done)

### 1. RED Phase - Write Failing Test
- Write ONE failing test that describes the expected behavior
- Run the test to confirm it fails
- Commit: "test: add test for <feature>"

### 2. GREEN Phase - Minimal Implementation
- Write the MINIMUM code to make the test pass
- Run tests to confirm they pass
- Commit: "feat: implement <feature>"

### 3. REFACTOR Phase (Optional)
- Clean up code while keeping tests green
- Commit: "refactor: improve <description>"

## Rules
- NEVER write implementation before tests
- ONE test at a time
- Run tests after EVERY change
- Stop when all requirements are met

## Validation Gates (Must Pass Before PR)
${tddConfig!.gates.map(g => `- ${g.name}: \`${g.command}\` ${g.required ? '(REQUIRED)' : '(optional)'}`).join('\n')}

## Time Limits
- Total: ${formatDuration(tddConfig!.timeout)}
- Idle: ${formatDuration(tddConfig!.idleTimeout)}

When done, create a PR to the develop branch.`;
      } else if (effectiveSkill === 'review') {
        systemPrompt = 'Review code thoroughly for security, quality, and best practices.';
      }

      if (template?.systemPrompt) {
        systemPrompt = template.systemPrompt;
      }

      console.log('\n\x1b[36m🚀 Starting Claude session...\x1b[0m');
      if (tddEnabled) {
        console.log('   Mode: \x1b[32mTDD\x1b[0m (Test-Driven Development)');
      }
      if (options.maxCost) {
        console.log(`   Budget: \x1b[33m$${options.maxCost.toFixed(2)}\x1b[0m`);
      }

      const eventRepo = new FileEventRepository(join(cwd, CONFIG_DIR));
      const approvalRepo = new FileToolApprovalRepository(join(cwd, CONFIG_DIR));

      // Save TDD state if enabled
      let tddState: TDDSessionState | null = null;
      let tddStatePath: string | null = null;

      if (tddEnabled) {
        tddState = {
          phase: 'writing_test',
          currentIteration: 1,
          gateResults: [],
          failureCount: 0,
          lastActivity: new Date(),
          config: tddConfig!,
        };
        tddStatePath = join(cwd, CONFIG_DIR, 'tdd-state', `${session.id}.json`);
        await mkdir(join(cwd, CONFIG_DIR, 'tdd-state'), { recursive: true });
        await writeFile(tddStatePath, JSON.stringify(tddState, null, 2));
      }

      // Track timeouts
      const sessionStartTime = Date.now();
      let lastOutputTime = Date.now();
      let sessionTimedOut = false;
      let idleTimedOut = false;
      let timeoutChecker: ReturnType<typeof setInterval> | null = null;

      if (tddEnabled && tddConfig) {
        timeoutChecker = setInterval(() => {
          const elapsed = Date.now() - sessionStartTime;
          const idleTime = Date.now() - lastOutputTime;

          if (elapsed >= tddConfig.timeout) {
            sessionTimedOut = true;
            console.log(`\n\x1b[31m[Timeout]\x1b[0m Session timeout (${formatDuration(tddConfig.timeout)}) exceeded.`);
            if (timeoutChecker) clearInterval(timeoutChecker);
          } else if (idleTime >= tddConfig.idleTimeout) {
            idleTimedOut = true;
            console.log(`\n\x1b[31m[Timeout]\x1b[0m Idle timeout (${formatDuration(tddConfig.idleTimeout)}) exceeded.`);
            if (timeoutChecker) clearInterval(timeoutChecker);
          }
        }, 5000);
      }

      claudeAdapter.on('output', async (event: ClaudeOutputEvent) => {
        const { output } = event;
        lastOutputTime = Date.now();

        let eventType: EventType = 'output';
        if (output.type === 'tool_use') {
          eventType = 'tool_call';

          try {
            const parsed = parseToolCall(output.content);
            if (parsed) {
              await approvalRepo.save({
                id: randomUUID(),
                sessionId: session.id,
                toolName: parsed.toolName,
                parameters: parsed.parameters,
                status: 'approved',
                approvedBy: 'auto',
                requestedAt: output.timestamp,
                resolvedAt: output.timestamp,
              });

              if (session.progress) {
                const detectedStep = detectProgressStep(parsed.toolName, parsed.parameters);
                if (detectedStep) {
                  session.progress = updateProgress(session.progress, detectedStep);
                  await sessionRepo.save(session);
                }
              }
            }
          } catch {
            // Ignore
          }
        } else if (output.type === 'error') {
          eventType = 'error';
        }

        try {
          await eventRepo.append({
            id: randomUUID(),
            sessionId: session.id,
            type: eventType,
            content: output.content,
            timestamp: output.timestamp,
          });
        } catch {
          // Ignore
        }
      });

      const result = await claudeAdapter.start({
        workingDir: worktree.path,
        prompt,
        systemPrompt,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
      });

      session.processId = result.processId;
      session.osProcessId = result.osProcessId;
      session.lastHeartbeat = new Date();
      session.status = 'running';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      const handleShutdown = async () => {
        console.log('\n[Info] Pausing session...');
        if (timeoutChecker) clearInterval(timeoutChecker);
        session.status = 'paused';
        session.updatedAt = new Date();
        await sessionRepo.save(session);
        if (tddState && tddStatePath) {
          tddState.phase = 'failed';
          await writeFile(tddStatePath, JSON.stringify(tddState, null, 2));
        }
        console.log(`Session paused: ${session.id.slice(0, 8)}`);
        console.log(`Resume with: claudetree resume ${session.id.slice(0, 8)}`);
        process.exit(0);
      };

      process.on('SIGINT', handleShutdown);
      process.on('SIGTERM', handleShutdown);

      console.log(`\nSession started: ${session.id.slice(0, 8)}`);
      console.log(`Working directory: ${worktree.path}`);
      console.log('Claude is now working on the issue...\n');

      let outputCount = 0;
      let currentCost = 0;
      let budgetExceeded = false;

      for await (const output of claudeAdapter.getOutput(result.processId)) {
        outputCount++;
        session.lastHeartbeat = new Date();
        lastOutputTime = Date.now();

        // Check timeouts
        if (sessionTimedOut || idleTimedOut) {
          await claudeAdapter.stop(result.processId);
          session.status = 'failed';
          if (tddState) tddState.phase = 'failed';
          break;
        }

        if (output.cumulativeCost !== undefined) {
          currentCost = output.cumulativeCost;

          if (options.maxCost && currentCost >= options.maxCost && !budgetExceeded) {
            budgetExceeded = true;
            console.log(`\x1b[31m[Budget]\x1b[0m Cost $${currentCost.toFixed(4)} exceeded limit $${options.maxCost.toFixed(4)}. Stopping...`);
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
          if (output.content) {
            session.claudeSessionId = output.content;
          }
          if (output.usage) {
            session.usage = output.usage;
            console.log(`\x1b[32m[Usage]\x1b[0m Tokens: ${output.usage.inputTokens} in / ${output.usage.outputTokens} out | Cost: $${output.usage.totalCostUsd.toFixed(4)}`);
          }
        }

        if (outputCount % 10 === 0) {
          session.updatedAt = new Date();
          await sessionRepo.save(session);
        }
      }

      if (timeoutChecker) clearInterval(timeoutChecker);

      // Run validation gates if TDD mode and session didn't fail
      if (tddEnabled && tddConfig && session.status !== 'failed' && !budgetExceeded) {
        console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[36m║         Running Validation Gates         ║\x1b[0m');
        console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

        if (tddState) {
          tddState.phase = 'validating';
          if (tddStatePath) await writeFile(tddStatePath, JSON.stringify(tddState, null, 2));
        }

        const gateRunner = new ValidationGateRunner();
        const gateResults = await gateRunner.runWithAutoRetry(
          tddConfig.gates,
          {
            cwd: worktree.path,
            maxRetries: tddConfig.maxRetries,
            onRetry: (attempt, failedGate) => {
              console.log(`\x1b[33m[Retry]\x1b[0m Gate '${failedGate}' failed, attempt ${attempt + 1}/${tddConfig.maxRetries}`);
            },
          }
        );

        console.log('\n\x1b[33m📊 Gate Results:\x1b[0m');
        for (const res of gateResults.results) {
          const icon = res.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
          const attempts = res.attempts > 1 ? ` (${res.attempts} attempts)` : '';
          console.log(`   ${icon} ${res.gateName}${attempts}`);
        }

        console.log(`\n   Total time: ${formatDuration(gateResults.totalTime)}`);

        if (tddState) {
          tddState.gateResults = gateResults.results;
        }

        if (gateResults.allPassed) {
          console.log('\n\x1b[32m✅ All validation gates passed!\x1b[0m');
          session.status = 'completed';
          if (tddState) tddState.phase = 'completed';
        } else {
          console.log('\n\x1b[31m❌ Validation gates failed.\x1b[0m');
          session.status = 'failed';
          if (tddState) tddState.phase = 'failed';

          const failedGate = gateResults.results.find(r => !r.passed);
          if (failedGate?.output) {
            console.log(`\n\x1b[33mFailed gate output (${failedGate.gateName}):\x1b[0m`);
            console.log(failedGate.output);
          }
        }
      } else if (!tddEnabled && session.status !== 'failed' && !budgetExceeded) {
        session.status = 'completed';
      }

      // Final summary
      const totalDuration = Date.now() - sessionStartTime;
      console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
      console.log('\x1b[36m║              Session Summary             ║\x1b[0m');
      console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

      console.log(`   Status: ${session.status === 'completed' ? '\x1b[32mcompleted\x1b[0m' : '\x1b[31mfailed\x1b[0m'}`);
      console.log(`   Mode: ${tddEnabled ? 'TDD' : 'Standard'}`);
      console.log(`   Duration: ${formatDuration(totalDuration)}`);
      if (session.usage) {
        console.log(`   Cost: $${session.usage.totalCostUsd.toFixed(4)}`);
      }

      session.updatedAt = new Date();
      await sessionRepo.save(session);
      if (tddState && tddStatePath) {
        await writeFile(tddStatePath, JSON.stringify(tddState, null, 2));
      }

      if (config.slack?.webhookUrl) {
        const slack = new SlackNotifier(config.slack.webhookUrl);
        await slack.notifySession({
          sessionId: session.id,
          status: session.status === 'completed' ? 'completed' : 'failed',
          issueNumber,
          branch: branchName,
          worktreePath: worktree.path,
          duration: totalDuration,
        });
      }

      if (session.status === 'failed') {
        process.exit(1);
      }

    } catch (error) {
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

  if (toolName === 'Edit' || toolName === 'Write') {
    return 'implementing';
  }

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

  if (newIdx > currentIdx) {
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
