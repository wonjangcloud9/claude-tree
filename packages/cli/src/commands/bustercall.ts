import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { GitHubAdapter, SlackNotifier } from '@claudetree/core';
import type { Issue } from '@claudetree/shared';

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

interface BustercallItem {
  issue: Issue;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
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
  return new Promise((resolve, reject) => {
    const args = ['start', String(issueNumber)];
    if (options.template) {
      args.push('--template', options.template);
    }

    const proc = spawn('claudetree', args, {
      cwd: options.cwd,
      stdio: 'inherit',
      detached: true,
    });

    proc.unref();
    setTimeout(() => resolve(), 1000);
    proc.on('error', reject);
  });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// Keywords that indicate potential conflicts with config/shared files
const CONFLICT_KEYWORDS = [
  'package.json', 'tsconfig', 'vitest', 'eslint', 'config',
  'dependencies', 'devDependencies', 'workspace', 'monorepo',
  'pnpm-lock', 'package-lock', 'yarn.lock', 'infrastructure',
  '설정', '의존성', '패키지', // Korean
];

// Labels that typically indicate config/infra changes
const DEFAULT_CONFLICT_LABELS = [
  'dependencies', 'infrastructure', 'config', 'setup', 'tooling',
  'build', 'ci', 'chore',
];

/**
 * Check if an issue might conflict with config/shared files
 */
function detectPotentialConflict(issue: Issue, conflictLabels: string[]): boolean {
  // Check labels
  const hasConflictLabel = issue.labels.some(label =>
    conflictLabels.some(cl => label.toLowerCase().includes(cl.toLowerCase()))
  );

  // Check title for conflict keywords
  const titleLower = issue.title.toLowerCase();
  const hasConflictKeyword = CONFLICT_KEYWORDS.some(kw =>
    titleLower.includes(kw.toLowerCase())
  );

  return hasConflictLabel || hasConflictKeyword;
}

/**
 * Group issues by conflict potential
 */
function groupIssuesByConflict(
  issues: Issue[],
  conflictLabels: string[]
): { conflicting: Issue[]; safe: Issue[] } {
  const conflicting: Issue[] = [];
  const safe: Issue[] = [];

  for (const issue of issues) {
    if (detectPotentialConflict(issue, conflictLabels)) {
      conflicting.push(issue);
    } else {
      safe.push(issue);
    }
  }

  return { conflicting, safe };
}

function printStatus(items: BustercallItem[]): void {
  console.clear();
  console.log('\n=== Bustercall ===\n');

  for (const item of items) {
    const icon =
      item.status === 'pending' ? '\u25CB' :
      item.status === 'running' ? '\u25D0' :
      item.status === 'completed' ? '\u25CF' :
      '\u2717';

    const color =
      item.status === 'pending' ? '\x1b[90m' :
      item.status === 'running' ? '\x1b[33m' :
      item.status === 'completed' ? '\x1b[32m' :
      '\x1b[31m';

    const title = truncate(item.issue.title, 40);
    const statusText = item.error ? ` [${item.error}]` : '';

    console.log(`  ${color}${icon}\x1b[0m #${item.issue.number} - ${title}${statusText}`);
  }

  const completed = items.filter((i) => i.status === 'completed').length;
  const failed = items.filter((i) => i.status === 'failed').length;
  const running = items.filter((i) => i.status === 'running').length;

  console.log(`\n[${completed}/${items.length}] completed, ${running} running, ${failed} failed`);
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

    let runningCount = 0;
    let currentIndex = 0;

    // Track which issues are "safe" for parallel execution
    const safeIssueNumbers = new Set(safe.map(i => i.number));

    const startNext = async () => {
      while (currentIndex < items.length) {
        const item = items[currentIndex];
        if (!item) break;

        const isSafe = safeIssueNumbers.has(item.issue.number);
        const currentParallelLimit = (isSafe && !options.sequential) ? effectiveParallel : 1;

        // Wait if we're at the parallel limit
        if (runningCount >= currentParallelLimit) {
          break;
        }

        currentIndex++;
        runningCount++;
        item.status = 'running';
        printStatus(items);

        try {
          await startSession(item.issue.number, {
            template: options.template,
            cwd,
          });
          item.status = 'completed';
        } catch (err) {
          item.status = 'failed';
          item.error = err instanceof Error ? err.message : 'Unknown error';
        }

        runningCount--;
        printStatus(items);

        // Continue to next item
        await startNext();
      }
    };

    // Start initial batch (respecting parallel limits)
    const promises: Promise<void>[] = [];
    const initialBatch = Math.min(effectiveParallel, safe.length || 1);
    for (let i = 0; i < initialBatch && i < items.length; i++) {
      promises.push(startNext());
    }

    await Promise.all(promises);

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
