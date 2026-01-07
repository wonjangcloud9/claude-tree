import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Session } from '@claudetree/shared';

const execAsync = promisify(exec);

export const CONFIG_DIR = '.claudetree';
export const SESSIONS_FILE = 'sessions.json';
export const DELETED_FILE = 'deleted.json';

export interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
}

export function getCwd(): string {
  return process.env.CLAUDETREE_ROOT || process.cwd();
}

export function getSessionsPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, SESSIONS_FILE);
}

export function getDeletedPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, DELETED_FILE);
}

export async function getWorktrees(cwd: string): Promise<WorktreeInfo[]> {
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
        const isMain = path === cwd || basename(path) === basename(cwd);
        worktrees.push({ path, branch, isMain });
      }
    }

    return worktrees;
  } catch {
    return [];
  }
}

export async function loadSessions(sessionsPath: string): Promise<Session[]> {
  try {
    const content = await readFile(sessionsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function loadDeletedWorktrees(cwd: string): Promise<Set<string>> {
  try {
    const deletedPath = getDeletedPath(cwd);
    const content = await readFile(deletedPath, 'utf-8');
    return new Set(JSON.parse(content));
  } catch {
    return new Set();
  }
}

export async function saveSessions(sessionsPath: string, sessions: Session[]): Promise<void> {
  await mkdir(join(sessionsPath, '..'), { recursive: true });
  await writeFile(sessionsPath, JSON.stringify(sessions, null, 2));
}

export async function addToDeletedList(cwd: string, worktreeId: string): Promise<void> {
  const deletedPath = getDeletedPath(cwd);
  let deleted: string[] = [];

  try {
    const content = await readFile(deletedPath, 'utf-8');
    deleted = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  if (!deleted.includes(worktreeId)) {
    deleted.push(worktreeId);
    await mkdir(join(cwd, CONFIG_DIR), { recursive: true });
    await writeFile(deletedPath, JSON.stringify(deleted, null, 2));
  }
}

export function extractIssueNumber(branch: string): number | null {
  const match = branch.match(/^issue-(\d+)/);
  return match ? parseInt(match[1] ?? '0', 10) : null;
}
