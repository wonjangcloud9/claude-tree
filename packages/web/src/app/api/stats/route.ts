import { NextResponse } from 'next/server';
import { getCwd, getSessionsPath, loadSessions } from '@/lib/session-utils';
import { calculateStatistics } from '@/lib/statistics-utils';

export async function GET() {
  try {
    const cwd = getCwd();
    const sessionsPath = getSessionsPath(cwd);
    const sessions = await loadSessions(sessionsPath);

    const stats = calculateStatistics(sessions);

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({
      totalSessions: 0,
      successRate: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      averageSessionDuration: 0,
      dailyStats: [],
      weeklyStats: [],
    });
  }
}
