import { Command } from 'commander';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { GitWorktreeAdapter, FileSessionRepository } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface CleanOptions {
  force: boolean;
  keepSessions: boolean;
  dryRun: boolean;
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export const cleanCommand = new Command('clean')
  .description('Remove all worktrees (except main)')
  .option('-f, --force', 'Force removal without confirmation', false)
  .option('--keep-sessions', 'Keep session records after removal', false)
  .option('--dry-run', 'Show what would be removed without removing', false)
  .action(async (options: CleanOptions) => {
    const cwd = process.cwd();
    const adapter = new GitWorktreeAdapter(cwd);

    try {
      const worktrees = await adapter.list();
      const toRemove = worktrees.filter((wt) => !wt.isMainWorktree);

      if (toRemove.length === 0) {
        console.log('No worktrees to remove.');
        return;
      }

      console.log('\n=== Clean Worktrees ===\n');
      console.log(`Found ${toRemove.length} worktree(s) to remove:\n`);

      for (const wt of toRemove) {
        const branch = wt.branch || '(detached)';
        console.log(`  \u2022 ${wt.path} (${branch})`);
      }

      if (options.dryRun) {
        console.log('\n[Dry run] No changes made.');
        return;
      }

      if (!options.force) {
        console.log('');
        const confirmed = await confirm('Are you sure you want to remove these worktrees?');
        if (!confirmed) {
          console.log('Cancelled.');
          return;
        }
      }

      console.log('');

      let successCount = 0;
      let failCount = 0;

      for (const wt of toRemove) {
        process.stdout.write(`Removing ${wt.path}... `);
        try {
          await adapter.remove(wt.path, options.force);
          console.log('\u2713');
          successCount++;
        } catch (error) {
          console.log('\u2717');
          if (error instanceof Error) {
            console.log(`  Error: ${error.message}`);
          }
          failCount++;
        }
      }

      // Clean up sessions if not keeping them
      if (!options.keepSessions) {
        const configDir = join(cwd, CONFIG_DIR);
        try {
          const sessionRepo = new FileSessionRepository(configDir);
          const sessions = await sessionRepo.findAll();

          // Find sessions that reference removed worktrees
          const removedPaths = new Set(toRemove.map((wt) => wt.path));
          const sessionsToDelete = sessions.filter(
            (s) => s.worktreePath && removedPaths.has(s.worktreePath)
          );

          for (const session of sessionsToDelete) {
            await sessionRepo.delete(session.id);
          }

          if (sessionsToDelete.length > 0) {
            console.log(`\nRemoved ${sessionsToDelete.length} associated session(s).`);
          }
        } catch {
          // Config dir might not exist, which is fine
        }
      }

      // Prune stale worktree entries
      process.stdout.write('\nPruning stale entries... ');
      try {
        await adapter.prune();
        console.log('\u2713');
      } catch {
        console.log('\u2717');
      }

      console.log(`\nRemoved ${successCount} worktree(s) successfully.`);
      if (failCount > 0) {
        console.log(`Failed to remove ${failCount} worktree(s).`);
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      }
      process.exit(1);
    }
  });
