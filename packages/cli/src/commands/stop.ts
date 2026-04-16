import { Command } from 'commander';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { FileSessionRepository, GitWorktreeAdapter } from '@claudetree/core';
import { exitNotInitialized, exitSessionNotFound } from '../errors.js';

const CONFIG_DIR = '.claudetree';

interface StopOptions {
  all: boolean;
  keepWorktree: boolean;
}

export const stopCommand = new Command('stop')
  .description('Stop a Claude session')
  .argument('[session-id]', 'Session ID (or "all" to stop all)')
  .option('--all', 'Stop all sessions', false)
  .option('--keep-worktree', 'Keep worktree after stopping', false)
  .action(async (sessionId: string | undefined, options: StopOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      const { access } = await import('node:fs/promises');
      await access(configDir);
    } catch {
      exitNotInitialized();
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    if (sessions.length === 0) {
      console.log('No active sessions.');
      return;
    }

    const toStop = options.all
      ? sessions
      : sessions.filter((s) => s.id.startsWith(sessionId ?? ''));

    if (toStop.length === 0) {
      exitSessionNotFound(sessionId ?? '');
    }

    for (const session of toStop) {
      console.log(`Stopping session: ${session.id.slice(0, 8)}`);

      // Update session status
      session.status = 'completed';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      // Optionally remove worktree
      if (!options.keepWorktree && session.worktreePath) {
        try {
          await stat(session.worktreePath);
          const adapter = new GitWorktreeAdapter(cwd);
          await adapter.remove(session.worktreePath, true);
          console.log(`  Worktree removed: ${session.worktreePath}`);
        } catch {
          console.log(`  Worktree already removed or not found.`);
        }
      }

      console.log(`  Status: completed`);
    }

    console.log(`\nStopped ${toStop.length} session(s).`);
  });
