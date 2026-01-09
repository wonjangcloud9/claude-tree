import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { GitHubAdapter, SlackNotifier } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface BatchOptions {
  label?: string;
  limit: number;
  template?: string;
  token?: string;
  file?: string;
  parallel: number;
  dryRun: boolean;
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

interface BatchItem {
  issue: string;
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
  issue: string,
  options: { template?: string; cwd: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['start', issue];
    if (options.template) {
      args.push('--template', options.template);
    }

    const proc = spawn('claudetree', args, {
      cwd: options.cwd,
      stdio: 'inherit',
      detached: true,
    });

    proc.unref();

    // Don't wait for completion, just start
    setTimeout(() => resolve(), 1000);

    proc.on('error', reject);
  });
}

function printStatus(items: BatchItem[]): void {
  console.clear();
  console.log('\n=== Batch Progress ===\n');

  for (const item of items) {
    const icon =
      item.status === 'pending' ? '○' :
      item.status === 'running' ? '◐' :
      item.status === 'completed' ? '●' :
      '✗';

    const color =
      item.status === 'pending' ? '\x1b[90m' :
      item.status === 'running' ? '\x1b[33m' :
      item.status === 'completed' ? '\x1b[32m' :
      '\x1b[31m';

    console.log(`${color}${icon}\x1b[0m ${item.issue} - ${item.status}`);
    if (item.error) {
      console.log(`  \x1b[31m${item.error}\x1b[0m`);
    }
  }

  const completed = items.filter((i) => i.status === 'completed').length;
  const failed = items.filter((i) => i.status === 'failed').length;
  const running = items.filter((i) => i.status === 'running').length;

  console.log(`\n[${completed}/${items.length}] completed, ${running} running, ${failed} failed`);
}

export const batchCommand = new Command('batch')
  .description('Start multiple Claude sessions in parallel')
  .argument('[issues...]', 'Issue numbers or GitHub URLs')
  .option('-l, --label <label>', 'Filter GitHub issues by label')
  .option('-n, --limit <number>', 'Maximum number of issues to process', '5')
  .option('-T, --template <template>', 'Session template to use')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
  .option('-f, --file <file>', 'Read issues from file (one per line)')
  .option('-P, --parallel <number>', 'Number of parallel sessions', '3')
  .option('--dry-run', 'Show what would be started without starting', false)
  .action(async (issueArgs: string[], options: BatchOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const ghToken = options.token ?? process.env.GITHUB_TOKEN ?? config.github?.token;
    let issues: string[] = [];

    // Collect issues from arguments
    if (issueArgs.length > 0) {
      issues = issueArgs;
    }

    // Read from file if specified
    if (options.file) {
      try {
        const content = await readFile(options.file, 'utf-8');
        const fileIssues = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        issues.push(...fileIssues);
      } catch {
        console.error(`Error reading file: ${options.file}`);
        process.exit(1);
      }
    }

    // Fetch from GitHub by label
    if (options.label) {
      if (!ghToken || !config.github?.owner || !config.github?.repo) {
        console.error('Error: GitHub token and repo config required for --label');
        process.exit(1);
      }

      const ghAdapter = new GitHubAdapter(ghToken);
      console.log(`Fetching issues with label: ${options.label}...`);

      try {
        const ghIssues = await ghAdapter.listIssues(
          config.github.owner,
          config.github.repo,
          { labels: options.label, state: 'open' }
        );

        const issueNumbers = ghIssues
          .slice(0, parseInt(options.limit as unknown as string, 10))
          .map((i) => String(i.number));

        console.log(`Found ${ghIssues.length} issues, using first ${issueNumbers.length}`);
        issues.push(...issueNumbers);
      } catch (err) {
        console.error(`Error fetching issues: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    }

    if (issues.length === 0) {
      console.error('Error: No issues specified.');
      console.log('\nUsage:');
      console.log('  ct batch 101 102 103           # Issue numbers');
      console.log('  ct batch --label bug           # By GitHub label');
      console.log('  ct batch --file issues.txt     # From file');
      process.exit(1);
    }

    // Deduplicate
    issues = [...new Set(issues)];

    // Apply limit
    const limit = parseInt(options.limit as unknown as string, 10);
    if (issues.length > limit) {
      console.log(`Limiting to ${limit} issues (use --limit to change)`);
      issues = issues.slice(0, limit);
    }

    console.log(`\nBatch: ${issues.length} issues`);
    if (options.template) {
      console.log(`Template: ${options.template}`);
    }

    // Dry run mode
    if (options.dryRun) {
      console.log('\n[Dry Run] Would start sessions for:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
      return;
    }

    // Initialize batch items
    const items: BatchItem[] = issues.map((issue) => ({
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
          await startSession(item.issue, {
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
    console.log('\n=== Batch Complete ===');
    const completed = items.filter((i) => i.status === 'completed').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    console.log(`Completed: ${completed}, Failed: ${failed}`);

    // Send Slack notification
    if (config.slack?.webhookUrl) {
      const slack = new SlackNotifier(config.slack.webhookUrl);
      await slack.notifyBatch(
        items.map((item) => ({
          issue: item.issue,
          status: item.status === 'completed' ? 'completed' : 'failed',
          error: item.error,
        }))
      );
      console.log('\nSlack notification sent.');
    }

    // Show session status command
    console.log('\nView all sessions: claudetree status');
    console.log('Open dashboard: claudetree web');
  });
