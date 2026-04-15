import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { Mutex } from 'async-mutex';
import { GitHubAdapter, SlackNotifier, FileSessionRepository } from '@claudetree/core';
import type { Issue } from '@claudetree/shared';

import {
  groupIssuesByConflict,
  DEFAULT_CONFLICT_LABELS,
  truncate,
  printStatus,
  waitForSessionCreated,
  sortIssues,
  analyzeIssues,
  type BustercallItem,
} from './bustercall/index.js';
import type { SortStrategy } from './bustercall/issueSorter.js';

const execAsync = promisify(exec);

const CONFIG_DIR = '.claudetree';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  if (min < 60) return `${min}m ${remainSec}s`;
  const hours = Math.floor(min / 60);
  const remainMin = min % 60;
  return `${hours}h ${remainMin}m`;
}

interface BustercallOptions {
  label?: string;
  limit: number;
  template?: string;
  token?: string;
  parallel: number;
  dryRun: boolean;
  exclude?: string;
  sequential: boolean;
  conflictLabels?: string;
  retry: number;
  tag?: string[];
  resume?: string;
  sort?: string;
  review: boolean;
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

async function startSession(
  issueNumber: number,
  options: { template?: string; cwd: string; retry?: number; tags?: string[] }
): Promise<void> {
  const args = ['start', String(issueNumber)];
  if (options.template) {
    args.push('--template', options.template);
  }
  if (options.retry && options.retry > 0) {
    args.push('--retry', String(options.retry));
  }
  if (options.tags?.length) {
    args.push('--tag', ...options.tags);
  }

  const proc = spawn('claudetree', args, {
    cwd: options.cwd,
    stdio: 'ignore',
    detached: true,
  });

  proc.unref();

  // Wait for process to initialize
  await new Promise((r) => setTimeout(r, 2000));

  // Check if session was created for this specific issue (poll for up to 60 seconds)
  const sessionCreated = await waitForSessionCreated(options.cwd, issueNumber, 60000);

  if (!sessionCreated) {
    throw new Error(`Session for issue #${issueNumber} was not created within 60 seconds`);
  }
}

async function getIssuesWithExistingPRs(
  owner: string,
  repo: string
): Promise<Set<number>> {
  try {
    const { stdout } = await execAsync(
      `gh pr list --repo ${owner}/${repo} --state open --json number,body,title --limit 100`
    );
    const prs = JSON.parse(stdout) as Array<{ number: number; body: string; title: string }>;
    const issuesWithPRs = new Set<number>();

    for (const pr of prs) {
      // Check title for issue references like "#123" or "issue-123"
      const titleMatches = pr.title.match(/#(\d+)|issue-(\d+)/gi) || [];
      for (const match of titleMatches) {
        const num = parseInt(match.replace(/\D/g, ''), 10);
        if (num) issuesWithPRs.add(num);
      }

      // Check body for "Closes #123", "Fixes #123", etc.
      if (pr.body) {
        const bodyMatches = pr.body.match(/(closes?|fixes?|resolves?)\s*#(\d+)/gi) || [];
        for (const match of bodyMatches) {
          const num = parseInt(match.replace(/\D/g, ''), 10);
          if (num) issuesWithPRs.add(num);
        }
      }
    }

    return issuesWithPRs;
  } catch {
    return new Set();
  }
}

export const bustercallCommand = new Command('bustercall')
  .alias('auto')
  .description('Auto-fetch open issues, detect conflicts, and start parallel sessions')
  .option('-l, --label <label>', 'Filter by GitHub label (comma-separated for AND)')
  .option('-n, --limit <number>', 'Maximum issues to process', '10')
  .option('-P, --parallel <number>', 'Number of parallel sessions', '3')
  .option('-T, --template <template>', 'Session template to use')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .option('-e, --exclude <numbers>', 'Exclude issue numbers (comma-separated)')
  .option('--dry-run', 'Show target issues without starting', false)
  .option('-S, --sequential', 'Force sequential execution (no parallel)', false)
  .option('--conflict-labels <labels>', 'Labels that indicate potential conflicts (comma-separated)')
  .option('--retry <n>', 'Auto-retry failed sessions (default: 0)', '0')
  .option('--tag <tags...>', 'Tags for sessions started by this bustercall')
  .option('--resume <batchId>', 'Resume a previous batch (retry only failed sessions)')
  .option('--sort <strategy>', 'Sort issues before processing (priority, newest, oldest)')
  .option('-R, --review', 'Auto-review: run a review session after each completion (Writer/Reviewer pattern)', false)
  .action(async (options: BustercallOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const ghToken = options.token ?? process.env.GITHUB_TOKEN ?? config.github?.token;

    if (!ghToken || !config.github?.owner || !config.github?.repo) {
      console.error('Error: GitHub configuration required for bustercall.');
      console.log('\nRequired:');
      console.log('  - GITHUB_TOKEN environment variable or --token flag');
      console.log('  - github.owner and github.repo in .claudetree/config.json');
      process.exit(1);
    }

    // Generate batch ID for this bustercall run
    const batchId = `batch-${randomUUID().slice(0, 8)}`;
    const batchTag = `bustercall:${batchId}`;

    const ghAdapter = new GitHubAdapter(ghToken);
    const sessionRepo = new FileSessionRepository(join(cwd, CONFIG_DIR));

    let issues: Issue[];

    // Resume mode: retry only failed sessions from a previous batch
    if (options.resume) {
      const resumeBatchTag = options.resume.startsWith('bustercall:')
        ? options.resume
        : `bustercall:${options.resume}`;

      console.log(`Resuming batch: ${resumeBatchTag}`);
      const allSessions = await sessionRepo.findAll();
      const failedSessions = allSessions.filter(
        (s) => s.status === 'failed' && s.tags?.includes(resumeBatchTag),
      );

      if (failedSessions.length === 0) {
        console.log('No failed sessions found for this batch. Nothing to resume.');
        process.exit(0);
      }

      const failedIssueNumbers = failedSessions
        .map((s) => s.issueNumber)
        .filter((n): n is number => n !== null);

      console.log(`Found ${failedIssueNumbers.length} failed session(s) to retry`);

      // Delete old failed sessions so they can be recreated
      for (const session of failedSessions) {
        await sessionRepo.delete(session.id);
      }

      // Fetch the specific issues from GitHub
      try {
        const allIssues = await ghAdapter.listIssues(
          config.github.owner,
          config.github.repo,
          { state: 'open' },
        );
        issues = allIssues.filter((i) => failedIssueNumbers.includes(i.number));
      } catch (err) {
        console.error(`Error fetching issues: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }

      if (issues!.length === 0) {
        console.log('Failed issues are no longer open. Nothing to resume.');
        process.exit(0);
      }

      // Tag with both new batch and resume reference
      options.tag = [...(options.tag ?? []), batchTag, `resumed:${resumeBatchTag}`];
      console.log(`Resuming ${issues!.length} issue(s) with new batch: ${batchId}\n`);
    } else {
      // Normal mode: fetch and filter issues
      console.log('Fetching open issues from GitHub...');

      try {
        issues = await ghAdapter.listIssues(
          config.github.owner,
          config.github.repo,
          {
            labels: options.label,
            state: 'open',
          }
        );
      } catch (err) {
        console.error(`Error fetching issues: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }

      // Apply exclude filter
      if (options.exclude) {
        const excludeSet = new Set(
          options.exclude.split(',').map((n) => parseInt(n.trim(), 10))
        );
        issues = issues.filter((i) => !excludeSet.has(i.number));
      }

      // Filter out issues that already have PRs
      console.log('Checking for existing PRs...');
      const issuesWithPRs = await getIssuesWithExistingPRs(config.github.owner, config.github.repo);
      if (issuesWithPRs.size > 0) {
        const before = issues.length;
        issues = issues.filter((i) => !issuesWithPRs.has(i.number));
        const skipped = before - issues.length;
        if (skipped > 0) {
          console.log(`Skipped ${skipped} issue(s) with existing PRs`);
        }
      }

      // Filter out issues with active/completed sessions
      try {
        const sessions = await sessionRepo.findAll();
        const handledIssues = new Set(
          sessions
            .filter((s) => s.status === 'running' || s.status === 'completed')
            .map((s) => s.issueNumber)
            .filter((n): n is number => n !== null),
        );
        if (handledIssues.size > 0) {
          const before = issues.length;
          issues = issues.filter((i) => !handledIssues.has(i.number));
          const skipped = before - issues.length;
          if (skipped > 0) {
            console.log(`Skipped ${skipped} issue(s) with active/completed sessions`);
          }
        }
      } catch {
        // Sessions file may not exist yet
      }

      // Apply sort strategy
      if (options.sort) {
        const validStrategies = ['priority', 'newest', 'oldest'];
        if (!validStrategies.includes(options.sort)) {
          console.error(`Error: Invalid sort strategy "${options.sort}". Valid: ${validStrategies.join(', ')}`);
          process.exit(1);
        }
        issues = sortIssues(issues, options.sort as SortStrategy);
        console.log(`Sorted issues by: ${options.sort}`);
      }

      // Apply limit
      const limit = parseInt(options.limit as unknown as string, 10);
      if (issues.length > limit) {
        console.log(`Found ${issues.length} issues, limiting to ${limit}`);
        issues = issues.slice(0, limit);
      } else {
        console.log(`Found ${issues.length} issues`);
      }

      if (issues.length === 0) {
        console.log('No open issues found matching criteria.');
        process.exit(0);
      }

      // Auto-tag with batch ID
      options.tag = [...(options.tag ?? []), batchTag];
    }

    // Parse conflict labels
    const conflictLabels = options.conflictLabels
      ? options.conflictLabels.split(',').map(l => l.trim())
      : DEFAULT_CONFLICT_LABELS;

    // Detect potential conflicts
    const { conflicting, safe } = groupIssuesByConflict(issues, conflictLabels);

    // Dry run mode
    if (options.dryRun) {
      // Smart issue analysis
      const { analyses, totalEstimatedMinutes, parallelEstimatedMinutes, complexityCounts } = analyzeIssues(issues);

      console.log('\n[Dry Run] Would start sessions for:\n');

      const COMPLEXITY_COLORS: Record<string, string> = {
        S: '\x1b[32m', M: '\x1b[36m', L: '\x1b[33m', XL: '\x1b[31m',
      };

      if (conflicting.length > 0) {
        console.log('\x1b[33m⚠️  Potential Conflict Issues (will run sequentially):\x1b[0m');
        conflicting.forEach((issue, i) => {
          const analysis = analyses.find((a) => a.issue.number === issue.number);
          const sizeTag = analysis
            ? ` ${COMPLEXITY_COLORS[analysis.complexity]}[${analysis.complexity}]\x1b[0m`
            : '';
          const catTag = analysis ? ` \x1b[90m(${analysis.category})\x1b[0m` : '';
          console.log(`  ${i + 1}. #${issue.number} - ${issue.title}${sizeTag}${catTag}`);
          if (issue.labels.length > 0) {
            console.log(`     Labels: ${issue.labels.join(', ')}`);
          }
        });
        console.log('');
      }

      if (safe.length > 0) {
        console.log('\x1b[32m✓ Safe Issues (will run in parallel):\x1b[0m');
        safe.forEach((issue, i) => {
          const analysis = analyses.find((a) => a.issue.number === issue.number);
          const sizeTag = analysis
            ? ` ${COMPLEXITY_COLORS[analysis.complexity]}[${analysis.complexity}]\x1b[0m`
            : '';
          const catTag = analysis ? ` \x1b[90m(${analysis.category})\x1b[0m` : '';
          console.log(`  ${i + 1}. #${issue.number} - ${issue.title}${sizeTag}${catTag}`);
          if (issue.labels.length > 0) {
            console.log(`     Labels: ${issue.labels.join(', ')}`);
          }
        });
      }

      // Complexity summary
      console.log('\n\x1b[1mComplexity Analysis:\x1b[0m');
      const sizeParts: string[] = [];
      if (complexityCounts.S > 0) sizeParts.push(`\x1b[32m${complexityCounts.S}S\x1b[0m`);
      if (complexityCounts.M > 0) sizeParts.push(`\x1b[36m${complexityCounts.M}M\x1b[0m`);
      if (complexityCounts.L > 0) sizeParts.push(`\x1b[33m${complexityCounts.L}L\x1b[0m`);
      if (complexityCounts.XL > 0) sizeParts.push(`\x1b[31m${complexityCounts.XL}XL\x1b[0m`);
      console.log(`  Size distribution: ${sizeParts.join(' | ')}`);
      console.log(`  Estimated time (sequential): ~${totalEstimatedMinutes}m`);
      console.log(`  Estimated time (parallel):   ~${parallelEstimatedMinutes}m`);

      if (options.review) {
        console.log(`  \x1b[36mWriter/Reviewer:\x1b[0m enabled (auto-review after each session)`);
      }

      if (conflicting.length > 0 && !options.sequential) {
        console.log('\n\x1b[90mTip: Use -S/--sequential to force all issues to run sequentially\x1b[0m');
      }

      return;
    }

    // Warn about conflicts
    if (conflicting.length > 0) {
      console.log(`\n\x1b[33m⚠️  Detected ${conflicting.length} issue(s) that may modify shared files:\x1b[0m`);
      conflicting.forEach(issue => {
        console.log(`   - #${issue.number}: ${truncate(issue.title, 50)}`);
      });
      console.log('\x1b[33m   These will run sequentially to avoid merge conflicts.\x1b[0m\n');
    }

    const startTime = Date.now();

    // Determine effective parallel limit
    // If sequential mode or all issues are conflicting, run one at a time
    const effectiveParallel = options.sequential ? 1 : parseInt(options.parallel as unknown as string, 10);

    // Reorder: run safe issues first (in parallel), then conflicting issues (sequentially)
    const orderedIssues = options.sequential ? issues : [...safe, ...conflicting];

    // Initialize items
    const items: BustercallItem[] = orderedIssues.map((issue) => ({
      issue,
      status: 'pending',
    }));

    // Shared state with mutex protection
    const mutex = new Mutex();
    let runningCount = 0;
    let currentIndex = 0;
    let conflictingRunning = false;

    // Track which issues are "safe" for parallel execution
    const safeIssueNumbers = new Set(safe.map(i => i.number));
    const conflictingIssueNumbers = new Set(conflicting.map(i => i.number));

    // Helper to safely update item status
    const updateItemStatus = async (
      index: number,
      status: BustercallItem['status'],
      error?: string
    ) => {
      const release = await mutex.acquire();
      try {
        const item = items[index];
        if (item) {
          item.status = status;
          if (error) item.error = error;
        }
        printStatus(items, startTime);
      } finally {
        release();
      }
    };

    const processItem = async (itemIndex: number, isConflicting: boolean) => {
      const item = items[itemIndex];
      if (!item) return;

      item.startedAt = Date.now();
      await updateItemStatus(itemIndex, 'running');

      try {
        await startSession(item.issue.number, {
          template: options.template,
          cwd,
          retry: options.retry,
          tags: options.tag,
        });
        item.completedAt = Date.now();
        await updateItemStatus(itemIndex, 'completed');

        // Writer/Reviewer pattern: auto-spawn review session
        if (options.review) {
          try {
            await startSession(item.issue.number, {
              template: 'review',
              cwd,
              tags: [...(options.tag ?? []), 'auto-review'],
            });
          } catch {
            // Review failure is non-critical - don't fail the main session
          }
        }
      } catch (err) {
        item.completedAt = Date.now();
        await updateItemStatus(itemIndex, 'failed', err instanceof Error ? err.message : 'Unknown error');
      }

      // Decrement counters with mutex
      const release = await mutex.acquire();
      try {
        runningCount--;
        if (isConflicting) {
          conflictingRunning = false;
        }
      } finally {
        release();
      }
    };

    const startNext = async (): Promise<void> => {
      while (true) {
        // Acquire mutex to safely check and update shared state
        const release = await mutex.acquire();

        let itemIndex: number | null = null;
        let isConflicting = false;

        try {
          if (currentIndex >= items.length) {
            return; // No more items
          }

          const item = items[currentIndex];
          if (!item) {
            return;
          }

          const isSafe = safeIssueNumbers.has(item.issue.number);
          isConflicting = conflictingIssueNumbers.has(item.issue.number);
          const currentParallelLimit = (isSafe && !options.sequential) ? effectiveParallel : 1;

          // For conflicting issues, ensure only one runs at a time
          if (isConflicting && conflictingRunning) {
            return; // Wait for current conflicting issue to finish
          }

          // Check parallel limit
          if (runningCount >= currentParallelLimit) {
            return; // At capacity
          }

          // Reserve this item
          itemIndex = currentIndex;
          currentIndex++;
          runningCount++;
          if (isConflicting) {
            conflictingRunning = true;
          }
        } finally {
          release();
        }

        if (itemIndex !== null) {
          // Process item outside mutex (long-running operation)
          await processItem(itemIndex, isConflicting);

          // Try to start next item
          await startNext();
        }
      }
    };

    // Calculate proper initial batch size
    let initialBatch: number;
    if (options.sequential) {
      initialBatch = 1;
    } else if (safe.length > 0) {
      initialBatch = Math.min(effectiveParallel, safe.length);
    } else if (conflicting.length > 0) {
      initialBatch = 1; // Conflicting issues run one at a time
    } else {
      initialBatch = 0;
    }

    // Start initial batch
    const promises: Promise<void>[] = [];
    for (let i = 0; i < initialBatch && i < items.length; i++) {
      promises.push(startNext());
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    // Final summary report
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const completed = items.filter((i) => i.status === 'completed').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const successRate = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

    console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║           Bustercall Summary             ║\x1b[0m');
    console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

    console.log(`  Batch ID:       \x1b[36m${batchId}\x1b[0m`);
    console.log(`  Total issues:   ${items.length} (${safe.length} safe, ${conflicting.length} conflicting)`);
    console.log(`  \x1b[32mCompleted:\x1b[0m      ${completed}`);
    console.log(`  \x1b[31mFailed:\x1b[0m         ${failed}`);
    if (pending > 0) {
      console.log(`  \x1b[33mPending:\x1b[0m        ${pending}`);
    }
    console.log(`  Success rate:   ${successRate}%`);
    console.log(`  Duration:       ${formatDuration(totalDuration)}`);
    console.log(`  Parallelism:    ${effectiveParallel}`);
    if (options.retry > 0) {
      console.log(`  Retry:          ${options.retry}x`);
    }

    // Show failed issues detail
    const failedItems = items.filter((i) => i.status === 'failed');
    if (failedItems.length > 0) {
      console.log('\n  \x1b[31mFailed Issues:\x1b[0m');
      for (const item of failedItems) {
        const title = truncate(item.issue.title, 40);
        console.log(`    #${item.issue.number} - ${title}`);
        if (item.error) {
          console.log(`      \x1b[90m${item.error}\x1b[0m`);
        }
      }
    }

    // Send Slack notification
    if (config.slack?.webhookUrl) {
      const slack = new SlackNotifier(config.slack.webhookUrl);
      await slack.notifyBatch(
        items.map((item) => ({
          issue: String(item.issue.number),
          status: item.status === 'completed' ? 'completed' : 'failed',
          error: item.error,
        }))
      );
      console.log('\n  Slack notification sent.');
    }

    if (failed > 0) {
      console.log(`\n  Retry failed:      \x1b[36mct auto --resume ${batchId}\x1b[0m`);
    }
    console.log(`  Filter by batch:   \x1b[36mct status --tag ${batchTag}\x1b[0m`);
    console.log('  View all sessions: \x1b[36mct status\x1b[0m');
    console.log('  Open dashboard:    \x1b[36mct web\x1b[0m\n');
  });
