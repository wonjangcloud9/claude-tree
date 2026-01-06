import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface StatusOptions {
  json: boolean;
  watch: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '\x1b[33m',   // yellow
  running: '\x1b[32m',   // green
  paused: '\x1b[34m',    // blue
  completed: '\x1b[36m', // cyan
  failed: '\x1b[31m',    // red
};
const RESET = '\x1b[0m';

export const statusCommand = new Command('status')
  .description('Show status of all sessions')
  .option('--json', 'Output as JSON', false)
  .option('-w, --watch', 'Watch mode with real-time updates', false)
  .action(async (options: StatusOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);

    const displayStatus = async () => {
      const sessions = await sessionRepo.findAll();

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        console.log('No active sessions.');
        return;
      }

      console.log('Sessions:\n');

      let totalCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const session of sessions) {
        const color = STATUS_COLORS[session.status] ?? '';
        const statusStr = `${color}${session.status}${RESET}`;
        const issueStr = session.issueNumber ? ` (Issue #${session.issueNumber})` : '';

        console.log(`  ${session.id.slice(0, 8)} - ${statusStr}${issueStr}`);
        console.log(`    Worktree: ${session.worktreeId.slice(0, 8)}`);
        if (session.prompt) {
          const truncatedPrompt = session.prompt.length > 50
            ? session.prompt.slice(0, 50) + '...'
            : session.prompt;
          console.log(`    Prompt: ${truncatedPrompt}`);
        }
        console.log(`    Created: ${session.createdAt.toLocaleString()}`);

        // Display token usage
        if (session.usage) {
          const { inputTokens, outputTokens, totalCostUsd } = session.usage;
          console.log(`    \x1b[33mTokens:\x1b[0m ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`);
          console.log(`    \x1b[33mCost:\x1b[0m $${totalCostUsd.toFixed(4)}`);
          totalCost += totalCostUsd;
          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
        }

        console.log('');
      }

      // Show totals if any session has usage data
      if (totalCost > 0) {
        console.log('\x1b[2m─────────────────────────────────────\x1b[0m');
        console.log(`\x1b[1mTotal:\x1b[0m ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out | \x1b[32m$${totalCost.toFixed(4)}\x1b[0m\n`);
      }
    };

    if (options.watch) {
      console.log('Watching sessions... (Ctrl+C to exit)\n');
      const interval = setInterval(async () => {
        console.clear();
        console.log('Watching sessions... (Ctrl+C to exit)\n');
        await displayStatus();
      }, 2000);

      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });

      await displayStatus();
    } else {
      await displayStatus();
    }
  });
