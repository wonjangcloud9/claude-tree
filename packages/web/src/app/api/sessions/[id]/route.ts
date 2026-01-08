import { NextResponse } from 'next/server';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Session } from '@claudetree/shared';
import {
  getCwd,
  getSessionsPath,
  loadSessions,
  saveSessions,
  addToDeletedList,
  CONFIG_DIR,
} from '@/lib/session-utils';
import { createApiErrorHandler, logApiError } from '@/lib/api-error';

const execAsync = promisify(exec);

interface Params {
  params: Promise<{ id: string }>;
}

const handleGetError = createApiErrorHandler('GET /api/sessions/[id]', {
  defaultMessage: 'Failed to read session',
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = getCwd();
    const sessionsPath = getSessionsPath(cwd);

    const sessions = await loadSessions(sessionsPath);
    const session = sessions.find((s) => s.id === id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    return handleGetError(error);
  }
}

const handleDeleteError = createApiErrorHandler('DELETE /api/sessions/[id]', {
  defaultMessage: 'Failed to delete session',
});

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = getCwd();
    const sessionsPath = getSessionsPath(cwd);

    const sessions = await loadSessions(sessionsPath);
    const sessionIndex = sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[sessionIndex];

    // Check if session is protected (develop/main branch)
    if ((session as { isProtected?: boolean })?.isProtected) {
      return NextResponse.json(
        { error: 'Cannot delete protected session (develop/main branch)' },
        { status: 403 }
      );
    }

    // Remove git worktree and branch if they exist
    if (session?.worktreeId) {
      // Get branch name before removing worktree
      let branchName: string | null = null;
      try {
        const { stdout } = await execAsync(
          `git worktree list --porcelain | grep -A2 "${session.worktreeId}" | grep "^branch" | cut -d/ -f3-`,
          { cwd }
        );
        branchName = stdout.trim();
      } catch (error) {
        // Worktree might not exist - log for debugging if unexpected
        logApiError('DELETE /api/sessions/[id] - get branch', error, { sessionId: id, worktreeId: session.worktreeId });
      }

      // Remove worktree
      try {
        await execAsync(`git worktree remove "${session.worktreeId}" --force`, { cwd });
      } catch (error) {
        // Worktree might not exist or already removed - log for debugging
        logApiError('DELETE /api/sessions/[id] - remove worktree', error, { sessionId: id, worktreeId: session.worktreeId });
      }

      // Delete branch after worktree is removed
      if (branchName && branchName !== 'main' && branchName !== 'develop' && branchName !== 'master') {
        try {
          await execAsync(`git branch -D "${branchName}"`, { cwd });
        } catch (error) {
          // Branch might not exist or already deleted - log for debugging
          logApiError('DELETE /api/sessions/[id] - delete branch', error, { sessionId: id, branchName });
        }
      }

      // Add to deleted list (so it won't be re-synced if worktree still exists)
      await addToDeletedList(cwd, session.worktreeId);
    }

    // Remove session from list
    sessions.splice(sessionIndex, 1);
    await saveSessions(sessionsPath, sessions);

    // Clean up related files (events, approvals, reviews)
    const filesToDelete = [
      join(cwd, CONFIG_DIR, 'events', `${id}.json`),
      join(cwd, CONFIG_DIR, 'approvals', `${id}.json`),
      join(cwd, CONFIG_DIR, 'reviews', `${id}.json`),
    ];

    for (const file of filesToDelete) {
      try {
        await rm(file);
      } catch {
        // Expected: file doesn't exist - no need to log
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleDeleteError(error);
  }
}
