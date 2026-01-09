import { Command } from 'commander';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  ClaudeSessionAdapter,
  FileSessionRepository,
  FileEventRepository,
  FileToolApprovalRepository,
  TemplateLoader,
  DEFAULT_TEMPLATES,
  SlackNotifier,
  ValidationGateRunner,
  generateAIReviewSummary,
  type ClaudeOutputEvent,
} from '@claudetree/core';
import type {
  Session,
  EventType,
  SessionTemplate,
  TDDConfig,
  TDDSessionState,
} from '@claudetree/shared';

import { parseIssueInput } from './start/parseIssueInput.js';
import { createOrFindWorktree } from './start/createWorktree.js';
import { buildPrompt, buildSystemPrompt, formatDuration } from './start/buildPrompt.js';
import { parseToolCall, detectProgressStep, updateProgress } from './start/progressTracker.js';
import { parseGates } from './start/validationGates.js';

const CONFIG_DIR = '.claudetree';

interface StartOptions {
  prompt?: string;
  noSession: boolean;
  tdd: boolean;
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

    // Parse issue input using extracted module
    const ghToken = options.token ?? process.env.GITHUB_TOKEN ?? config.github?.token;
    let parsedInput;

    try {
      parsedInput = await parseIssueInput(issue, {
        token: ghToken,
        branch: options.branch,
        githubConfig: config.github?.owner && config.github?.repo
          ? { owner: config.github.owner, repo: config.github.repo }
          : undefined,
      });

      if (parsedInput.issueData) {
        console.log(`\nFetched issue #${parsedInput.issueNumber}`);
        console.log(`  Title: ${parsedInput.issueData.title}`);
        console.log(`  Labels: ${parsedInput.issueData.labels.join(', ') || 'none'}`);
      } else if (parsedInput.taskDescription) {
        console.log(`\n📝 Task: "${parsedInput.taskDescription}"`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Failed to parse issue input'}`);
      process.exit(1);
    }

    const { issueNumber, issueData, branchName, taskDescription } = parsedInput;

    // Create or find worktree using extracted module
    // Support base branch from environment variable (used by chain command)
    const baseBranch = process.env.CLAUDETREE_BASE_BRANCH;
    let worktreeResult;
    try {
      worktreeResult = await createOrFindWorktree({
        cwd,
        worktreeDir: config.worktreeDir,
        branchName,
        issueNumber: issueNumber ?? undefined,
        baseBranch,
      });

      if (worktreeResult.isExisting) {
        console.log(`\nUsing existing worktree: ${branchName}`);
      } else {
        console.log(`\nCreating worktree: ${branchName}`);
      }
      console.log(`  Branch: ${worktreeResult.worktree.branch}`);
      console.log(`  Path: ${worktreeResult.worktree.path}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Failed to create worktree'}`);
      process.exit(1);
    }

    const { worktree } = worktreeResult;

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

      // Build prompt using extracted module
      const effectiveSkill = template?.skill || options.skill;
      const prompt = buildPrompt({
        issueNumber,
        issueData,
        branchName,
        taskDescription,
        tddEnabled,
        template,
        customPrompt: options.prompt,
      });

      // Build system prompt using extracted module
      const systemPrompt = buildSystemPrompt({
        tddEnabled,
        tddConfig: tddConfig ?? undefined,
        skill: effectiveSkill,
        template,
      });

      console.log('\n\x1b[36m🚀 Starting Claude session...\x1b[0m');
      if (tddEnabled) {
        console.log('   Mode: \x1b[32mTDD\x1b[0m (Test-Driven Development)');
      }
      if (options.maxCost) {
        console.log(`   Budget: \x1b[33m$${options.maxCost.toFixed(2)}\x1b[0m`);
      }

      const eventRepo = new FileEventRepository(join(cwd, CONFIG_DIR));
      const approvalRepo = new FileToolApprovalRepository(join(cwd, CONFIG_DIR));

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

      // Generate AI Review Summary for completed sessions
      if (session.status === 'completed') {
        console.log('\n\x1b[36m🤖 Generating AI Code Review Summary...\x1b[0m');
        try {
          const aiReview = await generateAIReviewSummary({
            sessionId: session.id,
            workingDir: worktree.path,
            baseBranch: 'develop',
          });

          if (aiReview) {
            // Save AI review to file
            const reviewsDir = join(cwd, CONFIG_DIR, 'ai-reviews');
            await mkdir(reviewsDir, { recursive: true });
            await writeFile(
              join(reviewsDir, `${session.id}.json`),
              JSON.stringify({ ...aiReview, generatedAt: aiReview.generatedAt.toISOString() }, null, 2)
            );

            // Print summary
            console.log(`\n   \x1b[32m✓ Summary:\x1b[0m ${aiReview.summary}`);
            console.log(`   \x1b[33m⚠ Risk Level:\x1b[0m ${aiReview.riskLevel.toUpperCase()}`);
            if (aiReview.potentialIssues.length > 0) {
              console.log(`   \x1b[31m! Issues:\x1b[0m ${aiReview.potentialIssues.length} potential issue(s) found`);
              for (const issue of aiReview.potentialIssues.slice(0, 3)) {
                const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
                console.log(`      ${icon} ${issue.title}`);
              }
            }
          }
        } catch {
          console.log('   \x1b[33m⚠ Could not generate AI review summary\x1b[0m');
        }
      }

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
