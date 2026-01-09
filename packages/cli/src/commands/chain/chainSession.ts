import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Chain } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const CHAINS_DIR = 'chains';

export interface SessionInfo {
  id: string;
  issueNumber?: number;
  status: string;
  worktreePath?: string;
}

/**
 * Load all sessions from sessions.json
 */
export async function loadSessions(cwd: string): Promise<SessionInfo[]> {
  try {
    const sessionsPath = join(cwd, CONFIG_DIR, 'sessions.json');
    const content = await readFile(sessionsPath, 'utf-8');
    return JSON.parse(content) as SessionInfo[];
  } catch {
    return [];
  }
}

/**
 * Save chain state to chains directory
 */
export async function saveChain(cwd: string, chain: Chain): Promise<void> {
  const chainsDir = join(cwd, CONFIG_DIR, CHAINS_DIR);
  await mkdir(chainsDir, { recursive: true });
  await writeFile(join(chainsDir, `${chain.id}.json`), JSON.stringify(chain, null, 2));
}

export interface WaitResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Wait for a session to complete or fail
 * Polls sessions.json every 3 seconds until status changes or timeout
 */
export async function waitForSession(
  cwd: string,
  issueNumber: number,
  timeoutMs: number = 300000
): Promise<WaitResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const sessions = await loadSessions(cwd);
    const session = sessions.find((s) => s.issueNumber === issueNumber);

    if (session) {
      if (session.status === 'completed') {
        return { success: true, sessionId: session.id };
      }
      if (session.status === 'failed') {
        return { success: false, sessionId: session.id, error: 'Session failed' };
      }
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  return { success: false, error: 'Session timeout' };
}
