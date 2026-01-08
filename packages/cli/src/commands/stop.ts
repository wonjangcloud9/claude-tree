import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';

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
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
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
      console.error(`No session found matching: ${sessionId}`);
      process.exit(1);
    }

    for (const session of toStop) {
      console.log(`Stopping session: ${session.id.slice(0, 8)}`);

      // Update session status
      session.status = 'completed';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      // Optionally remove worktree
      if (!options.keepWorktree) {
        try {
          // Note: We'd need to store the actual worktree path
          console.log(`  Session stopped. Worktree kept (use --keep-worktree=false to remove).`);
        } catch {
          console.log(`  Warning: Could not remove worktree.`);
        }
      }

      console.log(`  Status: completed`);
    }

    console.log(`\nStopped ${toStop.length} session(s).`);
  });
