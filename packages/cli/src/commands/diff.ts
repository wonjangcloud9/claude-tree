import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { exec as execCb } from 'node:child_process';
import { FileSessionRepository } from '@claudetree/core';
import { exitNotInitialized } from '../errors.js';
import type { Session } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface DiffOptions {
  session?: string;
  base: string;
  stat: boolean;
  all: boolean;
  tag?: string[];
}

function execAsync(cmd: string, opts?: { cwd?: string }): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    execCb(cmd, opts ?? {}, (error, stdout) => {
      if (error) reject(error);
      else resolve({ stdout: String(stdout) });
    });
  });
}

async function getSessionDiff(
  session: Session,
  base: string,
  statOnly: boolean,
): Promise<{ output: string; error?: string }> {
  if (!session.worktreePath) {
    return { output: '', error: 'No worktree path' };
  }

  try {
    const flag = statOnly ? '--stat' : '';
    const { stdout } = await execAsync(
      `git diff ${base}...HEAD ${flag}`,
      { cwd: session.worktreePath },
    );
    return { output: stdout.trim() || '(no changes)' };
  } catch {
    return { output: '', error: 'Failed to get diff' };
  }
}

async function getCommitCount(
  worktreePath: string,
  base: string,
): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `git rev-list --count ${base}..HEAD`,
      { cwd: worktreePath },
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

export const diffCommand = new Command('diff')
  .description('Show changes across session worktrees')
  .option('-s, --session <id>', 'Show diff for specific session')
  .option('-b, --base <branch>', 'Base branch to compare (default: develop)', 'develop')
  .option('--stat', 'Show only file change summary', false)
  .option('-a, --all', 'Show diffs for all sessions (not just running/completed)', false)
  .option('--tag <tags...>', 'Filter by tags')
  .action(async (options: DiffOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      exitNotInitialized();
    }

    const sessionRepo = new FileSessionRepository(configDir);
    let sessions = await sessionRepo.findAll();

    // Filter
    if (options.session) {
      sessions = sessions.filter(
        (s) => s.id === options.session || s.id.startsWith(options.session!),
      );
      if (sessions.length === 0) {
        console.error(`Session "${options.session}" not found.`);
        process.exit(1);
      }
    } else if (!options.all) {
      sessions = sessions.filter(
        (s) => s.status === 'running' || s.status === 'completed',
      );
    }

    if (options.tag?.length) {
      const filterTags = new Set(options.tag);
      sessions = sessions.filter(
        (s) => s.tags?.some((t: string) => filterTags.has(t)),
      );
    }

    if (sessions.length === 0) {
      console.log('No sessions found.');
      process.exit(0);
    }

    console.log(`\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m`);
    console.log(`\x1b[36m║            Session Diffs                  ║\x1b[0m`);
    console.log(`\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n`);
    console.log(`  Base: ${options.base} | Sessions: ${sessions.length}\n`);

    let totalFiles = 0;

    for (const session of sessions) {
      const issue = session.issueNumber ? `#${session.issueNumber}` : session.id.slice(0, 8);
      const statusColor =
        session.status === 'completed' ? '\x1b[32m' :
        session.status === 'running' ? '\x1b[33m' :
        '\x1b[31m';

      console.log(`\x1b[36m─── ${issue} (${statusColor}${session.status}\x1b[0m\x1b[36m) ───\x1b[0m`);

      if (session.worktreePath) {
        const commits = await getCommitCount(session.worktreePath, options.base);
        console.log(`  Path: ${session.worktreePath}`);
        console.log(`  Commits: ${commits}`);

        const { output, error } = await getSessionDiff(session, options.base, options.stat);
        if (error) {
          console.log(`  \x1b[31mError:\x1b[0m ${error}`);
        } else {
          // Count files in stat mode
          if (options.stat) {
            const fileLines = output.split('\n').filter((l) => l.includes('|'));
            totalFiles += fileLines.length;
          }
          console.log(output);
        }
      } else {
        console.log('  \x1b[90m(no worktree path)\x1b[0m');
      }
      console.log('');
    }

    if (options.stat && sessions.length > 1) {
      console.log(`\x1b[2m────────────────────────────────\x1b[0m`);
      console.log(`Total files changed across sessions: ${totalFiles}`);
    }
  });
