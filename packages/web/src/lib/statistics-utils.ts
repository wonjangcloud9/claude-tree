import type { Session } from '@claudetree/shared';
import type {
  SessionStatistics,
  DailyStatistics,
  WeeklyStatistics,
} from '@claudetree/shared';

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return getDateKey(d);
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

function calculateWeeklyStats(sessions: Session[], weeks: number): WeeklyStatistics[] {
  const stats = new Map<string, WeeklyStatistics>();
  const today = new Date();

  for (let i = 0; i < weeks; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i * 7);
    const weekStart = getWeekStart(date);
    if (!stats.has(weekStart)) {
      stats.set(weekStart, {
        weekStart,
        sessionsCount: 0,
        completedCount: 0,
        failedCount: 0,
        costUsd: 0,
        successRate: 0,
      });
    }
  }

  for (const session of sessions) {
    const weekStart = getWeekStart(new Date(session.createdAt));
    const stat = stats.get(weekStart);
    if (stat) {
      stat.sessionsCount++;
      if (session.status === 'completed') stat.completedCount++;
      if (session.status === 'failed') stat.failedCount++;
      if (session.usage) {
        stat.costUsd += session.usage.totalCostUsd;
      }
    }
  }

  for (const stat of stats.values()) {
    const total = stat.completedCount + stat.failedCount;
    stat.successRate = total > 0 ? (stat.completedCount / total) * 100 : 0;
  }

  return Array.from(stats.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function calculateStatistics(sessions: Session[]): SessionStatistics {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const failedSessions = sessions.filter((s) => s.status === 'failed').length;
  const finishedSessions = completedSessions + failedSessions;
  const successRate = finishedSessions > 0 ? (completedSessions / finishedSessions) * 100 : 0;

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

  const dailyStats = calculateDailyStats(sessions, 30);
  const weeklyStats = calculateWeeklyStats(sessions, 12);

  // Tag breakdown
  const tagBreakdown: Record<string, { count: number; cost: number; completed: number; failed: number }> = {};
  for (const session of sessions) {
    for (const tag of session.tags ?? []) {
      if (!tagBreakdown[tag]) {
        tagBreakdown[tag] = { count: 0, cost: 0, completed: 0, failed: 0 };
      }
      const entry = tagBreakdown[tag]!;
      entry.count++;
      if (session.usage) entry.cost += session.usage.totalCostUsd;
      if (session.status === 'completed') entry.completed++;
      if (session.status === 'failed') entry.failed++;
    }
  }

  // Retry stats
  const sessionsWithRetries = sessions.filter((s) => s.retryCount > 0).length;
  const totalRetries = sessions.reduce((sum, s) => sum + (s.retryCount ?? 0), 0);

  return {
    totalSessions,
    successRate,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    averageSessionDuration,
    dailyStats,
    weeklyStats,
    tagBreakdown,
    retryStats: { sessionsWithRetries, totalRetries },
  };
}
