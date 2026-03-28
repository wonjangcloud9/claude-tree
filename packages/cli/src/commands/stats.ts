import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';
import type { Session, DailyStatistics, SessionStatistics } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

interface StatsOptions {
  json: boolean;
}

// --- Statistics calculation (reimplemented from web) ---

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function calculateDailyStats(sessions: Session[], days: number): DailyStatistics[] {
  const stats = new Map<string, DailyStatistics>();
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = getDateKey(date);
    stats.set(key, {
      date: key,
      sessionsCount: 0,
      completedCount: 0,
      failedCount: 0,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  for (const session of sessions) {
    const dateKey = getDateKey(new Date(session.createdAt));
    const stat = stats.get(dateKey);
    if (stat) {
      stat.sessionsCount++;
      if (session.status === 'completed') stat.completedCount++;
      if (session.status === 'failed') stat.failedCount++;
      if (session.usage) {
        stat.costUsd += session.usage.totalCostUsd;
        stat.inputTokens += session.usage.inputTokens;
        stat.outputTokens += session.usage.outputTokens;
      }
    }
  }

  return Array.from(stats.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateStats(sessions: Session[]): SessionStatistics {
  const totalSessions = sessions.length;
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const failed = sessions.filter((s) => s.status === 'failed').length;
  const finished = completed + failed;
  const successRate = finished > 0 ? (completed / finished) * 100 : 0;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  let totalDuration = 0;
  let sessionsWithDuration = 0;

  for (const session of sessions) {
    if (session.usage) {
      totalInputTokens += session.usage.inputTokens;
      totalOutputTokens += session.usage.outputTokens;
      totalCostUsd += session.usage.totalCostUsd;
    }
    if (session.createdAt && session.updatedAt) {
      const start = new Date(session.createdAt).getTime();
      const end = new Date(session.updatedAt).getTime();
      if (end > start) {
        totalDuration += end - start;
        sessionsWithDuration++;
      }
    }
  }

  const averageSessionDuration =
    sessionsWithDuration > 0 ? totalDuration / sessionsWithDuration : 0;

  const dailyStats = calculateDailyStats(sessions, 7);

  return {
    totalSessions,
    successRate,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    averageSessionDuration,
    dailyStats,
    weeklyStats: [],
  };
}

// --- Formatting helpers ---

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return '< 1 min';
  return `${minutes} min`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.toLocaleString('en', { month: 'short' });
  const day = d.getDate();
  return `${month} ${String(day).padStart(2)}`;
}

function renderBar(count: number, maxCount: number, maxWidth: number): string {
  if (maxCount === 0) return '';
  const width = Math.max(1, Math.round((count / maxCount) * maxWidth));
  return '\u2588'.repeat(width);
}

// --- Display ---

function displayStats(stats: SessionStatistics): void {
  const completed = Math.round(
    (stats.successRate / 100) * (stats.totalSessions)
  );
  const failed = stats.totalSessions - completed;

  console.log('');
  console.log(`${BOLD}claudetree Statistics${RESET}`);
  console.log('');
  console.log(
    `  ${DIM}Sessions:${RESET}     ` +
    `${stats.totalSessions} total | ` +
    `${GREEN}${completed} completed${RESET} | ` +
    `${RED}${failed} failed${RESET}`
  );
  console.log(
    `  ${DIM}Success:${RESET}      ` +
    `${stats.successRate > 0 ? GREEN : DIM}${stats.successRate.toFixed(1)}%${RESET}`
  );
  console.log(
    `  ${DIM}Cost:${RESET}         ` +
    `${YELLOW}$${stats.totalCostUsd.toFixed(2)}${RESET}`
  );
  console.log(
    `  ${DIM}Tokens:${RESET}       ` +
    `${CYAN}${formatTokens(stats.totalInputTokens)}${RESET} input / ` +
    `${CYAN}${formatTokens(stats.totalOutputTokens)}${RESET} output`
  );
  console.log(
    `  ${DIM}Avg Duration:${RESET} ` +
    `${formatDuration(stats.averageSessionDuration)}`
  );

  if (stats.dailyStats.length > 0) {
    const maxSessions = Math.max(...stats.dailyStats.map((d) => d.sessionsCount));
    const BAR_WIDTH = 16;

    console.log('');
    console.log(`  ${DIM}Last 7 Days:${RESET}`);

    for (const day of stats.dailyStats) {
      const label = formatDateLabel(day.date);
      const bar = day.sessionsCount > 0
        ? `${GREEN}${renderBar(day.sessionsCount, maxSessions, BAR_WIDTH)}${RESET}`
        : `${DIM}-${RESET}`;
      const info = day.sessionsCount > 0
        ? `${day.sessionsCount} sessions  $${day.costUsd.toFixed(2)}`
        : '0 sessions';
      console.log(`  ${DIM}${label}${RESET}  ${bar} ${info}`);
    }
  }

  console.log('');
}

// --- Command ---

export const statsCommand = new Command('stats')
  .description('Show session statistics and analytics')
  .option('--json', 'Output as JSON', false)
  .action(async (options: StatsOptions) => {
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

    const stats = calculateStats(sessions);

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    if (sessions.length === 0) {
      console.log('No sessions found.');
      return;
    }

    displayStats(stats);
  });
