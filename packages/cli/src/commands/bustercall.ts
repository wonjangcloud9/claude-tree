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

    // Dry run mode
    if (options.dryRun) {
      console.log('\n[Dry Run] Would start sessions for:\n');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. #${issue.number} - ${issue.title}`);
        if (issue.labels.length > 0) {
          console.log(`     Labels: ${issue.labels.join(', ')}`);
        }
      });
      return;
    }

    // Initialize items
    const items: BustercallItem[] = issues.map((issue) => ({
      issue,
      status: 'pending',
    }));

    const parallelLimit = parseInt(options.parallel as unknown as string, 10);
    let runningCount = 0;
    let currentIndex = 0;

    const startNext = async () => {
      while (runningCount < parallelLimit && currentIndex < items.length) {
        const item = items[currentIndex];
        if (!item) break;

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
      }
    };

    // Start initial batch
    const promises: Promise<void>[] = [];
    for (let i = 0; i < parallelLimit && i < items.length; i++) {
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
