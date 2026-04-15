import { Command } from 'commander';
import { join } from 'node:path';
import { access, stat } from 'node:fs/promises';
import { GitWorktreeAdapter, FileSessionRepository } from '@claudetree/core';
import type { SessionStatus } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

interface CleanupOptions {
  dryRun: boolean;
  status: string;
  olderThan?: string;
  batch?: string;
}

function parseOlderThan(value: string): number {
  const match = value.match(/^(\d+)([hdwm])$/);
  if (!match) return 0;
  const val = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const msMap: Record<string, number> = {
    h: 3_600_000, d: 86_400_000, w: 604_800_000, m: 2_592_000_000,
  };
  return val * (msMap[unit] ?? 86_400_000);
}

export const cleanupCommand = new Command('cleanup')
  .description('Smart cleanup: remove finished sessions and their worktrees')
  .option('--dry-run', 'Preview what would be removed', false)
  .option('--status <status>', 'Status to clean: completed, failed, or both (default: both)', 'both')
  .option('--older-than <duration>', 'Only remove sessions older than duration (e.g., 24h, 7d)')
  .option('-b, --batch <batchId>', 'Only clean sessions from a specific batch')
  .action(async (options: CleanupOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "ct init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    let sessions = await sessionRepo.findAll();

    // Filter by status
    const targetStatuses: SessionStatus[] = [];
    if (options.status === 'completed') {
      targetStatuses.push('completed');
    } else if (options.status === 'failed') {
      targetStatuses.push('failed');
    } else {
      targetStatuses.push('completed', 'failed');
    }
    sessions = sessions.filter((s) => targetStatuses.includes(s.status));

    // Filter by age
    if (options.olderThan) {
      const ageMs = parseOlderThan(options.olderThan);
      if (ageMs > 0) {
        const cutoff = Date.now() - ageMs;
        sessions = sessions.filter(
          (s) => new Date(s.updatedAt).getTime() < cutoff,
        );
      }
    }

    // Filter by batch
    if (options.batch) {
      const batchTag = options.batch.startsWith('bustercall:')
        ? options.batch
        : `bustercall:${options.batch}`;
      sessions = sessions.filter((s) => s.tags?.includes(batchTag));
    }

    if (sessions.length === 0) {
      console.log('No sessions to clean up.');
      return;
    }

    // Categorize
    const completed = sessions.filter((s) => s.status === 'completed');
    const failed = sessions.filter((s) => s.status === 'failed');

    console.log(`\n${CYAN}=== Cleanup Preview ===${RESET}\n`);

    if (completed.length > 0) {
      console.log(`  ${GREEN}Completed:${RESET} ${completed.length} session(s)`);
      for (const s of completed) {
        const issue = s.issueNumber ? `#${s.issueNumber}` : 'no issue';
        const cost = s.usage ? `$${s.usage.totalCostUsd.toFixed(4)}` : '-';
        console.log(`    ${DIM}${s.id.slice(0, 8)} | ${issue} | ${cost}${RESET}`);
      }
    }

    if (failed.length > 0) {
      console.log(`  ${RED}Failed:${RESET}    ${failed.length} session(s)`);
      for (const s of failed) {
        const issue = s.issueNumber ? `#${s.issueNumber}` : 'no issue';
        const err = s.lastError ? ` (${s.lastError.slice(0, 40)})` : '';
        console.log(`    ${DIM}${s.id.slice(0, 8)} | ${issue}${err}${RESET}`);
      }
    }

    // Check for worktrees to remove
    let worktreeCount = 0;
    for (const s of sessions) {
      if (s.worktreePath) {
        try {
          await stat(s.worktreePath);
          worktreeCount++;
        } catch {
          // Worktree already gone
        }
      }
    }

    if (worktreeCount > 0) {
      console.log(`\n  ${YELLOW}Worktrees:${RESET} ${worktreeCount} to remove`);
    }

    console.log(`\n  ${DIM}Total: ${sessions.length} session(s) + ${worktreeCount} worktree(s)${RESET}`);

    if (options.dryRun) {
      console.log(`\n  ${YELLOW}[Dry run] No changes made.${RESET}\n`);
      return;
    }

    // Actually clean up
    console.log('');
    const adapter = new GitWorktreeAdapter(cwd);
    let removedSessions = 0;
    let removedWorktrees = 0;

    for (const s of sessions) {
      // Remove worktree if exists
      if (s.worktreePath) {
        try {
          await stat(s.worktreePath);
          await adapter.remove(s.worktreePath, true);
          removedWorktrees++;
        } catch {
          // Already gone
        }
      }

      // Delete session record
      await sessionRepo.delete(s.id);
      removedSessions++;
    }

    // Prune stale worktree refs
    try {
      await adapter.prune();
    } catch {
      // Non-critical
    }

    console.log(`  ${GREEN}Removed:${RESET} ${removedSessions} session(s), ${removedWorktrees} worktree(s)`);
    console.log(`  ${DIM}Tip: Use "ct status" to verify remaining sessions${RESET}\n`);
  });
