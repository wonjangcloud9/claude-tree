import { Command } from 'commander';
import { GitWorktreeAdapter } from '@claudetree/core';

interface ListOptions {
  json: boolean;
}

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all worktrees')
  .option('--json', 'Output as JSON', false)
  .action(async (options: ListOptions) => {
    const cwd = process.cwd();
    const adapter = new GitWorktreeAdapter(cwd);

    try {
      const worktrees = await adapter.list();

      if (options.json) {
        console.log(JSON.stringify(worktrees, null, 2));
        return;
      }

      if (worktrees.length === 0) {
        console.log('No worktrees found.');
        return;
      }

      console.log('Worktrees:\n');
      for (const wt of worktrees) {
        const mainTag = wt.isMainWorktree ? ' (main)' : '';
        const branch = wt.branch || '(detached)';
        console.log(`  ${branch}${mainTag}`);
        console.log(`    Path: ${wt.path}`);
        console.log(`    Commit: ${wt.commit.slice(0, 8)}`);
        console.log('');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      }
      process.exit(1);
    }
  });
