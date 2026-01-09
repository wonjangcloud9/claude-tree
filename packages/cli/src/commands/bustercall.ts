import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Mutex } from 'async-mutex';
import { GitHubAdapter, SlackNotifier } from '@claudetree/core';
import type { Issue } from '@claudetree/shared';

import {
  groupIssuesByConflict,
  DEFAULT_CONFLICT_LABELS,
  truncate,
  printStatus,
  waitForSessionCreated,
  type BustercallItem,
} from './bustercall/index.js';

const execAsync = promisify(exec);

const CONFIG_DIR = '.claudetree';

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
  options: { template?: string; cwd: string }
): Promise<void> {
  const args = ['start', String(issueNumber)];
  if (options.template) {
    args.push('--template', options.template);
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
  .description('Auto-fetch all open issues and start parallel Claude sessions')
  .option('-l, --label <label>', 'Filter by GitHub label (comma-separated for AND)')
  .option('-n, --limit <number>', 'Maximum issues to process', '10')
  .option('-P, --parallel <number>', 'Number of parallel sessions', '3')
  .option('-T, --template <template>', 'Session template to use')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .option('-e, --exclude <numbers>', 'Exclude issue numbers (comma-separated)')
  .option('--dry-run', 'Show target issues without starting', false)
  .option('-S, --sequential', 'Force sequential execution (no parallel)', false)
  .option('--conflict-labels <labels>', 'Labels that indicate potential conflicts (comma-separated)')
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

    const ghAdapter = new GitHubAdapter(ghToken);
    console.log('Fetching open issues from GitHub...');

    let issues: Issue[];
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

    // Parse conflict labels
    const conflictLabels = options.conflictLabels
      ? options.conflictLabels.split(',').map(l => l.trim())
      : DEFAULT_CONFLICT_LABELS;

    // Detect potential conflicts
    const { conflicting, safe } = groupIssuesByConflict(issues, conflictLabels);

    // Dry run mode
    if (options.dryRun) {
      console.log('\n[Dry Run] Would start sessions for:\n');

      if (conflicting.length > 0) {
        console.log('\x1b[33m⚠️  Potential Conflict Issues (will run sequentially):\x1b[0m');
        conflicting.forEach((issue, i) => {
          console.log(`  ${i + 1}. #${issue.number} - ${issue.title}`);
          if (issue.labels.length > 0) {
            console.log(`     Labels: ${issue.labels.join(', ')}`);
          }
        });
        console.log('');
      }

      if (safe.length > 0) {
        console.log('\x1b[32m✓ Safe Issues (will run in parallel):\x1b[0m');
        safe.forEach((issue, i) => {
          console.log(`  ${i + 1}. #${issue.number} - ${issue.title}`);
          if (issue.labels.length > 0) {
            console.log(`     Labels: ${issue.labels.join(', ')}`);
          }
        });
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
        printStatus(items);
      } finally {
        release();
      }
    };

    const processItem = async (itemIndex: number, isConflicting: boolean) => {
      const item = items[itemIndex];
      if (!item) return;

      await updateItemStatus(itemIndex, 'running');

      try {
        await startSession(item.issue.number, {
          template: options.template,
          cwd,
        });
        await updateItemStatus(itemIndex, 'completed');
      } catch (err) {
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

    // Final status
    console.log('\n=== Bustercall Complete ===');
    const completed = items.filter((i) => i.status === 'completed').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    console.log(`Completed: ${completed}, Failed: ${failed}`);

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
      console.log('\nSlack notification sent.');
    }

    console.log('\nView all sessions: claudetree status');
    console.log('Open dashboard: claudetree web');
  });
