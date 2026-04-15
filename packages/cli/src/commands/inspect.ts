import { Command } from 'commander';
import { join } from 'node:path';
import { access, stat } from 'node:fs/promises';
import { FileSessionRepository, FileEventRepository } from '@claudetree/core';
import type { Session, ProgressStep } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

const STATUS_COLORS: Record<string, string> = {
  pending: YELLOW,
  running: GREEN,
  paused: '\x1b[34m',
  completed: CYAN,
  failed: RED,
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  if (min < 60) return `${min}m ${remainSec}s`;
  const hours = Math.floor(min / 60);
  return `${hours}h ${min % 60}m`;
}

interface InspectOptions {
  json: boolean;
}

export const inspectCommand = new Command('inspect')
  .description('Show detailed information about a session')
  .argument('<session>', 'Session ID (prefix) or issue number')
  .option('--json', 'Output as JSON', false)
  .action(async (sessionArg: string, options: InspectOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "ct init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    // Find by ID prefix or issue number
    let session: Session | undefined;
    session = sessions.find((s) => s.id.startsWith(sessionArg));
    if (!session) {
      const num = Number(sessionArg);
      if (!isNaN(num)) {
        session = sessions.find((s) => s.issueNumber === num);
      }
    }

    if (!session) {
      console.error(`Error: No session found matching "${sessionArg}".`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(session, null, 2));
      return;
    }

    const color = STATUS_COLORS[session.status] ?? '';
    const duration = formatDuration(
      new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime(),
    );

    // Header
    console.log(`\n${BOLD}Session: ${session.id.slice(0, 8)}${RESET}`);
    console.log(`${'─'.repeat(50)}`);

    // Basic info
    console.log(`  ${BOLD}Status:${RESET}      ${color}${session.status}${RESET}`);
    if (session.issueNumber) {
      console.log(`  ${BOLD}Issue:${RESET}       #${session.issueNumber}`);
    }
    if (session.prompt) {
      const p = session.prompt.length > 60
        ? session.prompt.slice(0, 60) + '...'
        : session.prompt;
      console.log(`  ${BOLD}Prompt:${RESET}      ${p}`);
    }
    console.log(`  ${BOLD}Worktree:${RESET}    ${session.worktreeId.slice(0, 8)}`);
    if (session.worktreePath) {
      console.log(`  ${BOLD}Path:${RESET}        ${session.worktreePath}`);
    }

    // Timing
    console.log(`\n  ${BOLD}Created:${RESET}     ${session.createdAt.toLocaleString()}`);
    console.log(`  ${BOLD}Updated:${RESET}     ${session.updatedAt.toLocaleString()}`);
    console.log(`  ${BOLD}Duration:${RESET}    ${duration}`);
    if (session.lastHeartbeat) {
      const hbAge = Date.now() - new Date(session.lastHeartbeat).getTime();
      console.log(`  ${BOLD}Heartbeat:${RESET}   ${formatDuration(hbAge)} ago`);
    }

    // Tags
    if (session.tags?.length) {
      console.log(`\n  ${BOLD}Tags:${RESET}        ${session.tags.join(', ')}`);

      // Extract batch info
      const batchTag = session.tags.find((t) => t.startsWith('bustercall:'));
      if (batchTag) {
        console.log(`  ${BOLD}Batch:${RESET}       ${CYAN}${batchTag}${RESET}`);
      }
      const rerunTag = session.tags.find((t) => t.startsWith('rerun:'));
      if (rerunTag) {
        console.log(`  ${BOLD}Rerun of:${RESET}    ${rerunTag}`);
      }
    }

    // Token usage
    if (session.usage) {
      const { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, totalCostUsd } = session.usage;
      console.log(`\n  ${BOLD}${YELLOW}Token Usage:${RESET}`);
      console.log(`    Input:     ${inputTokens.toLocaleString()}`);
      console.log(`    Output:    ${outputTokens.toLocaleString()}`);
      if (cacheReadInputTokens > 0) {
        console.log(`    Cache R:   ${cacheReadInputTokens.toLocaleString()}`);
      }
      if (cacheCreationInputTokens > 0) {
        console.log(`    Cache W:   ${cacheCreationInputTokens.toLocaleString()}`);
      }
      console.log(`    ${BOLD}Cost:${RESET}      ${GREEN}$${totalCostUsd.toFixed(4)}${RESET}`);
    }

    // Progress
    if (session.progress) {
      const steps: ProgressStep[] = ['analyzing', 'implementing', 'testing', 'committing', 'creating_pr'];
      const completed = new Set(session.progress.completedSteps);
      console.log(`\n  ${BOLD}Progress:${RESET}`);
      for (const step of steps) {
        const icon = completed.has(step)
          ? `${GREEN}✓${RESET}`
          : step === session.progress.currentStep
            ? `${CYAN}▸${RESET}`
            : `${DIM}○${RESET}`;
        console.log(`    ${icon} ${step}`);
      }
    }

    // Retry info
    if (session.retryCount > 0) {
      console.log(`\n  ${BOLD}${YELLOW}Retries:${RESET}     ${session.retryCount}`);
    }
    if (session.lastError) {
      console.log(`  ${BOLD}${RED}Last Error:${RESET}  ${session.lastError}`);
    }

    // Event count
    try {
      const eventRepo = new FileEventRepository(configDir);
      const events = await eventRepo.getLatest(session.id, 1000);
      if (events.length > 0) {
        console.log(`\n  ${BOLD}Events:${RESET}      ${events.length} total`);
        console.log(`  ${DIM}View events: ct log ${session.id.slice(0, 8)}${RESET}`);
      }
    } catch {
      // Event repo might not exist
    }

    // Worktree check
    if (session.worktreePath) {
      try {
        await stat(session.worktreePath);
        console.log(`  ${DIM}Worktree:    exists${RESET}`);
      } catch {
        console.log(`  ${RED}Worktree:    missing (cleaned up?)${RESET}`);
      }
    }

    // Actions
    console.log(`\n  ${DIM}Actions:${RESET}`);
    if (session.status === 'failed' || session.status === 'completed') {
      console.log(`    ${DIM}Rerun:   ct rerun ${session.id.slice(0, 8)}${RESET}`);
    }
    if (session.status === 'paused' || session.status === 'running') {
      console.log(`    ${DIM}Resume:  ct resume ${session.id.slice(0, 8)}${RESET}`);
    }
    if (session.status === 'running') {
      console.log(`    ${DIM}Stop:    ct stop ${session.id.slice(0, 8)}${RESET}`);
    }
    console.log(`    ${DIM}Events:  ct log ${session.id.slice(0, 8)}${RESET}`);
    console.log('');
  });
