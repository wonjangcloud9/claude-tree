import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { GitHubAdapter, FileSessionRepository } from '@claudetree/core';
import type { Issue } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const WATCH_STATE_FILE = 'watch-state.json';

interface WatchOptions {
  label?: string;
  interval: string;
  template?: string;
  token?: string;
  limit: string;
  dryRun: boolean;
}

interface Config {
  worktreeDir: string;
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
  };
}

interface WatchState {
  processedIssues: number[];
  lastPollAt: string | null;
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

async function loadWatchState(cwd: string): Promise<WatchState> {
  try {
    const statePath = join(cwd, CONFIG_DIR, WATCH_STATE_FILE);
    const content = await readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { processedIssues: [], lastPollAt: null };
  }
}

async function saveWatchState(
  cwd: string,
  state: WatchState,
): Promise<void> {
  const statePath = join(cwd, CONFIG_DIR, WATCH_STATE_FILE);
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

function startSessionDetached(
  issueNumber: number,
  options: { template?: string; cwd: string },
): void {
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
}

export const watchCommand = new Command('watch')
  .description(
    'Watch GitHub for new issues and auto-start sessions',
  )
  .option(
    '-l, --label <label>',
    'Only watch issues with this label (e.g. claudetree, auto)',
  )
  .option(
    '-i, --interval <seconds>',
    'Polling interval in seconds (default: 60)',
    '60',
  )
  .option(
    '-T, --template <template>',
    'Session template for new sessions',
  )
  .option('-t, --token <token>', 'GitHub token')
  .option(
    '--limit <n>',
    'Max sessions to start per poll cycle (default: 3)',
    '3',
  )
  .option(
    '--dry-run',
    'Show what would be started without starting',
    false,
  )
  .action(async (options: WatchOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error(
        'Error: claudetree not initialized. Run "claudetree init" first.',
      );
      process.exit(1);
    }

    const owner = config.github?.owner;
    const repo = config.github?.repo;

    if (!owner || !repo) {
      console.error(
        'Error: GitHub owner/repo not configured. Run "claudetree init".',
      );
      process.exit(1);
    }

    const token =
      options.token ??
      process.env.GITHUB_TOKEN ??
      config.github?.token;

    if (!token) {
      console.error(
        'Error: GitHub token required. Use --token or set GITHUB_TOKEN.',
      );
      process.exit(1);
    }

    const intervalMs =
      parseInt(options.interval, 10) * 1000;
    const limit = parseInt(options.limit, 10);
    const github = new GitHubAdapter(token);
    const sessionRepo = new FileSessionRepository(
      join(cwd, CONFIG_DIR),
    );
    const state = await loadWatchState(cwd);

    console.log(
      '\x1b[36m╔══════════════════════════════════════════╗\x1b[0m',
    );
    console.log(
      '\x1b[36m║          Watching GitHub Issues           ║\x1b[0m',
    );
    console.log(
      '\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n',
    );
    console.log(`  Repo: ${owner}/${repo}`);
    console.log(
      `  Label filter: ${options.label ?? '(all open issues)'}`,
    );
    console.log(`  Interval: ${options.interval}s`);
    console.log(`  Max per cycle: ${limit}`);
    if (options.template) {
      console.log(`  Template: ${options.template}`);
    }
    if (options.dryRun) {
      console.log(`  \x1b[33mDry run mode\x1b[0m`);
    }
    console.log(
      `\n\x1b[90mPress Ctrl+C to stop watching.\x1b[0m\n`,
    );

    const poll = async () => {
      const now = new Date();
      console.log(
        `\x1b[90m[${now.toLocaleTimeString()}]\x1b[0m Polling...`,
      );

      try {
        const issues: Issue[] = await github.listIssues(
          owner,
          repo,
          {
            labels: options.label,
            state: 'open',
          },
        );

        // Get existing sessions to avoid duplicates
        const sessions = await sessionRepo.findAll();
        const activeIssues = new Set(
          sessions
            .filter(
              (s) =>
                s.status === 'running' ||
                s.status === 'pending',
            )
            .map((s) => s.issueNumber)
            .filter((n): n is number => n !== null),
        );

        const processedSet = new Set(state.processedIssues);

        const newIssues = issues.filter(
          (issue) =>
            !processedSet.has(issue.number) &&
            !activeIssues.has(issue.number),
        );

        if (newIssues.length === 0) {
          console.log('  No new issues found.\n');
        } else {
          console.log(
            `  Found ${newIssues.length} new issue(s)`,
          );

          const toStart = newIssues.slice(0, limit);

          for (const issue of toStart) {
            const truncTitle =
              issue.title.length > 50
                ? issue.title.slice(0, 50) + '...'
                : issue.title;

            if (options.dryRun) {
              console.log(
                `  \x1b[33m[DRY]\x1b[0m Would start #${issue.number}: ${truncTitle}`,
              );
            } else {
              console.log(
                `  \x1b[32m[START]\x1b[0m #${issue.number}: ${truncTitle}`,
              );
              startSessionDetached(issue.number, {
                template: options.template,
                cwd,
              });
            }

            state.processedIssues.push(issue.number);
          }

          if (newIssues.length > limit) {
            console.log(
              `  \x1b[90m(${newIssues.length - limit} more waiting for next cycle)\x1b[0m`,
            );
          }

          console.log('');
        }

        state.lastPollAt = now.toISOString();
        await saveWatchState(cwd, state);
      } catch (error) {
        console.error(
          `  \x1b[31m[Error]\x1b[0m ${error instanceof Error ? error.message : 'Poll failed'}`,
        );
      }
    };

    // Initial poll
    await poll();

    // Recurring poll
    const interval = setInterval(poll, intervalMs);

    const shutdown = async () => {
      clearInterval(interval);
      console.log('\n\x1b[36mWatch stopped.\x1b[0m');
      await saveWatchState(cwd, state);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
