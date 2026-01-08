import { NextResponse } from 'next/server';
import { getCwd, getSessionsPath, loadSessions } from '@/lib/session-utils';
import { calculateStatistics } from '@/lib/statistics-utils';
import { createApiErrorHandler } from '@/lib/api-error';

const emptyStats = {
  totalSessions: 0,
  successRate: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCostUsd: 0,
  averageSessionDuration: 0,
  dailyStats: [],
  weeklyStats: [],
};

const handleError = createApiErrorHandler('GET /api/stats', {
  fallbackResponse: emptyStats,
});

export async function GET() {
  try {
    const cwd = getCwd();
    const sessionsPath = getSessionsPath(cwd);
    const sessions = await loadSessions(sessionsPath);

    const stats = calculateStatistics(sessions);

    return NextResponse.json(stats);
  } catch (error) {
    return handleError(error);
  }
}
