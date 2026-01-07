import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const createTestSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-1',
  worktreeId: '/tmp/worktree-1',
  claudeSessionId: null,
  status: 'pending',
  issueNumber: null,
  prompt: 'Test prompt',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: null,
  usage: null,
  progress: null,
  ...overrides,
});

describe('GET /api/sessions', () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'web-api-test-'));
    originalEnv = process.env.CLAUDETREE_ROOT;
    process.env.CLAUDETREE_ROOT = testDir;

    vi.resetModules();
  });

  afterEach(async () => {
    process.env.CLAUDETREE_ROOT = originalEnv;
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return empty array when no sessions exist', async () => {
    const { GET } = await import('./route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return existing sessions', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });

    const sessions = [
      createTestSession({ id: 's1', worktreeId: '/wt/1' }),
      createTestSession({ id: 's2', worktreeId: '/wt/2' }),
    ];
    await writeFile(
      join(configDir, 'sessions.json'),
      JSON.stringify(sessions)
    );

    const { GET } = await import('./route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('s1');
    expect(data[1].id).toBe('s2');
  });

  it('should return empty array on error', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, 'sessions.json'), 'invalid json');

    const { GET } = await import('./route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
