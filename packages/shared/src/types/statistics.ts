export interface DailyStatistics {
  date: string;
  sessionsCount: number;
  completedCount: number;
  failedCount: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export interface WeeklyStatistics {
  weekStart: string;
  sessionsCount: number;
  completedCount: number;
  failedCount: number;
  costUsd: number;
  successRate: number;
}

export interface TagBreakdown {
  count: number;
  cost: number;
  completed: number;
  failed: number;
}

export interface RetryStats {
  sessionsWithRetries: number;
  totalRetries: number;
}

export interface SessionStatistics {
  totalSessions: number;
  successRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  averageSessionDuration: number;
  dailyStats: DailyStatistics[];
  weeklyStats: WeeklyStatistics[];
  tagBreakdown?: Record<string, TagBreakdown>;
  retryStats?: RetryStats;
}
