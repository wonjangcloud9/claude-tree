import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

const CONFIG_DIR = '.claudetree';

export interface SessionInfo {
  issueNumber?: number;
  status?: string;
}

/**
 * Get all sessions for a specific issue number
 */
export async function getSessionsForIssue(cwd: string, issueNumber: number): Promise<SessionInfo[]> {
  try {
    const sessionsPath = join(cwd, CONFIG_DIR, 'sessions.json');
    const content = await readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(content) as SessionInfo[];
    return sessions.filter((s) => s.issueNumber === issueNumber);
  } catch {
    return [];
  }
}

/**
 * Wait for a session to be created for a specific issue
 * Returns true if session is found within timeout, false otherwise
 */
export async function waitForSessionCreated(
  cwd: string,
  issueNumber: number,
  timeoutMs: number
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const sessions = await getSessionsForIssue(cwd, issueNumber);
    // Check if there's a running session for this issue
    if (sessions.some((s) => s.status === 'running')) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
