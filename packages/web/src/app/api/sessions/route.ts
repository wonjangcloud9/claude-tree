import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import type { Session } from '@claudetree/shared';

const execAsync = promisify(exec);

const CONFIG_DIR = '.claudetree';
const SESSIONS_FILE = 'sessions.json';

interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
}

async function getWorktrees(cwd: string): Promise<WorktreeInfo[]> {
  try {
    const { stdout } = await execAsync('git worktree list --porcelain', { cwd });
    const worktrees: WorktreeInfo[] = [];
    const blocks = stdout.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      let path = '';
      let branch = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.slice('worktree '.length);
        } else if (line.startsWith('branch ')) {
          branch = line.slice('branch refs/heads/'.length);
        }
      }

      if (path) {
        // Check if it's the main worktree (same as cwd)
        const isMain = path === cwd || basename(path) === basename(cwd);
        worktrees.push({ path, branch, isMain });
      }
    }

    return worktrees;
  } catch {
    return [];
  }
}

async function loadSessions(sessionsPath: string): Promise<Session[]> {
  try {
    const content = await readFile(sessionsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveSessions(sessionsPath: string, sessions: Session[]): Promise<void> {
  await mkdir(join(sessionsPath, '..'), { recursive: true });
  await writeFile(sessionsPath, JSON.stringify(sessions, null, 2));
}

function extractIssueNumber(branch: string): number | null {
  const match = branch.match(/^issue-(\d+)/);
  return match ? parseInt(match[1] ?? '0', 10) : null;
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const sessionsPath = join(cwd, CONFIG_DIR, SESSIONS_FILE);

    // Load existing sessions
    let sessions = await loadSessions(sessionsPath);

    // Get current worktrees
    const worktrees = await getWorktrees(cwd);

    // Sync: add sessions for worktrees that don't have one
    let hasChanges = false;

    for (const worktree of worktrees) {
      if (worktree.isMain) continue;

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
  } catch {
    return NextResponse.json([]);
  }
}
