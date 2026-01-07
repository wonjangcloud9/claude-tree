import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
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

const createMockRequest = (): Request => {
  return new Request('http://localhost:3000/api/sessions/test-id');
};

const createParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

let testDir: string;
let originalEnv: string | undefined;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'web-api-session-id-test-'));
  originalEnv = process.env.CLAUDETREE_ROOT;
  process.env.CLAUDETREE_ROOT = testDir;
});

afterAll(async () => {
  process.env.CLAUDETREE_ROOT = originalEnv;
  await rm(testDir, { recursive: true, force: true });
});

describe('GET /api/sessions/[id]', () => {
  it('should return 404 when session not found', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, 'sessions.json'), '[]');

    const { GET } = await import('./route');
    const response = await GET(createMockRequest(), createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should return session when found', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });

    const sessions = [createTestSession({ id: 'target-session' })];
    await writeFile(join(configDir, 'sessions.json'), JSON.stringify(sessions));

    const { GET } = await import('./route');
    const response = await GET(createMockRequest(), createParams('target-session'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('target-session');
    expect(data.status).toBe('pending');
  });
});

describe('DELETE /api/sessions/[id]', () => {
  it('should return 404 when session not found for DELETE', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, 'sessions.json'), '[]');

    const { DELETE } = await import('./route');
    const response = await DELETE(createMockRequest(), createParams('nonexistent-delete'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should return 403 for protected session', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });

    const sessions = [
      { ...createTestSession({ id: 'protected-session' }), isProtected: true },
    ];
    await writeFile(join(configDir, 'sessions.json'), JSON.stringify(sessions));

    const { DELETE } = await import('./route');
    const response = await DELETE(createMockRequest(), createParams('protected-session'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Cannot delete protected session');
  });

  it('should delete session successfully', async () => {
    const configDir = join(testDir, '.claudetree');
    await mkdir(configDir, { recursive: true });

    const sessions = [createTestSession({ id: 'delete-me', worktreeId: '' })];
    await writeFile(join(configDir, 'sessions.json'), JSON.stringify(sessions));

    const { DELETE } = await import('./route');
    const response = await DELETE(createMockRequest(), createParams('delete-me'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const remaining = JSON.parse(await readFile(join(configDir, 'sessions.json'), 'utf-8'));
    expect(remaining.find((s: Session) => s.id === 'delete-me')).toBeUndefined();
  });
});
