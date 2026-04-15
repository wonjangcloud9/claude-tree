import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository, ClaudeSessionAdapter } from '@claudetree/core';
import type { ProgressStep, SessionProgress, Session } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface StatusOptions {
  json: boolean;
  watch: boolean;
  health: boolean;
  tag?: string[];
  state?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '\x1b[33m',   // yellow
  running: '\x1b[32m',   // green
  paused: '\x1b[34m',    // blue
  completed: '\x1b[36m', // cyan
  failed: '\x1b[31m',    // red
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';

const STEP_LABELS: Record<ProgressStep, string> = {
  analyzing: 'Analyzing',
  implementing: 'Implementing',
  testing: 'Testing',
  committing: 'Committing',
  creating_pr: 'Creating PR',
};

function renderProgressBar(progress: SessionProgress | null): string {
  if (!progress) return '';

  const steps: ProgressStep[] = ['analyzing', 'implementing', 'testing', 'committing', 'creating_pr'];
  const completed = new Set(progress.completedSteps);
  const current = progress.currentStep;

  const bar = steps.map((step) => {
    if (completed.has(step)) {
      return `${GREEN}●${RESET}`; // Completed
    } else if (step === current) {
      return `${CYAN}◉${RESET}`; // Current (animated feel)
    } else {
      return `${DIM}○${RESET}`; // Pending
    }
  }).join('─');

  const label = STEP_LABELS[current] ?? current;
  return `    ${bar} ${DIM}${label}${RESET}`;
}

function formatDuration(startDate: Date, endDate?: Date): string {
  const ms = (endDate ?? new Date()).getTime() - new Date(startDate).getTime();
  if (ms < 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function checkProcessHealth(session: Session): 'alive' | 'dead' | 'unknown' {
  if (!session.osProcessId) return 'unknown';
  const adapter = new ClaudeSessionAdapter();
  return adapter.isProcessAlive(session.osProcessId) ? 'alive' : 'dead';
}

function getHeartbeatAge(session: Session): string | null {
  if (!session.lastHeartbeat) return null;
  const ageMs = Date.now() - new Date(session.lastHeartbeat).getTime();
  if (ageMs < 60_000) return `${Math.round(ageMs / 1000)}s ago`;
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m ago`;
  return `${Math.round(ageMs / 3_600_000)}h ago`;
}

export const statusCommand = new Command('status')
  .description('Show status of all sessions')
  .option('--json', 'Output as JSON', false)
  .option('-w, --watch', 'Watch mode with real-time updates', false)
  .option('--health', 'Check process health and mark zombie sessions as failed', false)
  .option('--tag <tags...>', 'Filter sessions by tag')
  .option('-s, --state <status>', 'Filter sessions by status (pending, running, paused, completed, failed)')
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
      let sessions = await sessionRepo.findAll();

      // Filter by status if specified
      if (options.state) {
        const validStates = ['pending', 'running', 'paused', 'completed', 'failed'];
        if (!validStates.includes(options.state)) {
          console.error(`Error: Invalid state "${options.state}". Valid states: ${validStates.join(', ')}`);
          process.exit(1);
        }
        sessions = sessions.filter((s) => s.status === options.state);
      }

      // Filter by tags if specified
      if (options.tag && options.tag.length > 0) {
        const filterTags = new Set(options.tag);
        sessions = sessions.filter(
          (s) => s.tags?.some((t: string) => filterTags.has(t)),
        );
      }

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

      let zombieCount = 0;

      for (const session of sessions) {
        const color = STATUS_COLORS[session.status] ?? '';
        const statusStr = `${color}${session.status}${RESET}`;
        const issueStr = session.issueNumber ? ` (Issue #${session.issueNumber})` : '';
        const tagsStr = session.tags?.length ? ` [${session.tags.join(', ')}]` : '';

        // Health check for running sessions
        let healthIndicator = '';
        if (session.status === 'running') {
          const health = checkProcessHealth(session);
          if (health === 'dead') {
            healthIndicator = ` \x1b[31m[ZOMBIE]\x1b[0m`;
            zombieCount++;
            if (options.health) {
              session.status = 'failed';
              session.lastError = 'Process died (detected by health check)';
              session.updatedAt = new Date();
              await sessionRepo.save(session);
              healthIndicator = ` \x1b[33m[RECOVERED -> failed]\x1b[0m`;
            }
          } else if (health === 'alive') {
            healthIndicator = ` \x1b[32m[HEALTHY]\x1b[0m`;
          }
        }

        console.log(`  ${session.id.slice(0, 8)} - ${statusStr}${issueStr}${tagsStr}${healthIndicator}`);
        console.log(`    Worktree: ${session.worktreeId.slice(0, 8)}`);
        if (session.prompt) {
          const truncatedPrompt = session.prompt.length > 50
            ? session.prompt.slice(0, 50) + '...'
            : session.prompt;
          console.log(`    Prompt: ${truncatedPrompt}`);
        }
        console.log(`    Created: ${session.createdAt.toLocaleString()}`);

        // Display duration
        const endTime = (session.status === 'running' || session.status === 'pending')
          ? undefined
          : session.updatedAt;
        console.log(`    Duration: ${formatDuration(session.createdAt, endTime)}`);

        // Display heartbeat age for running sessions
        if (session.status === 'running') {
          const heartbeatAge = getHeartbeatAge(session);
          if (heartbeatAge) {
            console.log(`    Heartbeat: ${heartbeatAge}`);
          }
        }

        // Display retry info if applicable
        if (session.retryCount > 0) {
          console.log(`    \x1b[33mRetries:\x1b[0m ${session.retryCount}`);
          if (session.lastError) {
            const truncErr = session.lastError.length > 60
              ? session.lastError.slice(0, 60) + '...'
              : session.lastError;
            console.log(`    \x1b[31mLast error:\x1b[0m ${truncErr}`);
          }
        }

        // Display progress for running sessions
        if (session.status === 'running' && session.progress) {
          console.log(renderProgressBar(session.progress));
        }

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

      // Show zombie warning
      if (zombieCount > 0 && !options.health) {
        console.log(`\x1b[31m⚠ ${zombieCount} zombie session(s) detected.\x1b[0m`);
        console.log(`  Run \x1b[33mct status --health\x1b[0m to auto-recover them.\n`);
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
