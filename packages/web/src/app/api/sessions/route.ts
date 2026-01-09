import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { Session } from '@claudetree/shared';
import {
  getCwd,
  getSessionsPath,
  getWorktrees,
  loadSessions,
  loadDeletedWorktrees,
  saveSessions,
  extractIssueNumber,
} from '@/lib/session-utils';
import { createApiErrorHandler } from '@/lib/api-error';

const handleError = createApiErrorHandler('GET /api/sessions', {
  fallbackResponse: [],
});

export async function GET() {
  try {
    const cwd = getCwd();
    const sessionsPath = getSessionsPath(cwd);

    // Load existing sessions and deleted worktrees
    const sessions = await loadSessions(sessionsPath);
    const deletedWorktrees = await loadDeletedWorktrees(cwd);

    // Get current worktrees
    const worktrees = await getWorktrees(cwd);

    // Sync: add sessions for worktrees that don't have one
    let hasChanges = false;

    for (const worktree of worktrees) {
      if (worktree.isMain) continue;

      // Skip if this worktree was deleted by user
      if (deletedWorktrees.has(worktree.path)) continue;

      const hasSession = sessions.some(
        (s) => s.worktreeId === worktree.path
      );

      if (!hasSession) {
        const newSession: Session = {
          id: randomUUID(),
          worktreeId: worktree.path,
          claudeSessionId: null,
          status: 'pending',
          issueNumber: extractIssueNumber(worktree.branch),
          prompt: `Working on ${worktree.branch}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          processId: null,
          osProcessId: null,
          lastHeartbeat: null,
          errorCount: 0,
          worktreePath: worktree.path,
          usage: null,
          progress: null,
        };
        sessions.push(newSession);
        hasChanges = true;
      }
    }

    // Save if there were changes
    if (hasChanges) {
      await saveSessions(sessionsPath, sessions);
    }

    return NextResponse.json(sessions);
  } catch (error) {
    return handleError(error);
  }
}
