import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SerializedToolApproval } from '@claudetree/shared';

const createTestApproval = (
  overrides: Partial<SerializedToolApproval> = {}
): SerializedToolApproval => ({
  id: 'approval-1',
  sessionId: 'test-session',
  toolName: 'bash',
  parameters: { command: 'ls -la' },
  status: 'pending',
  approvedBy: null,
  requestedAt: '2024-01-01T00:00:00.000Z',
  resolvedAt: null,
  ...overrides,
});

const createMockRequest = (): Request => {
  return new Request('http://localhost:3000/api/sessions/test-id/approvals');
};

const createParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

let testDir: string;
let originalEnv: string | undefined;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'web-api-approvals-test-'));
  originalEnv = process.env.CLAUDETREE_ROOT;
  process.env.CLAUDETREE_ROOT = testDir;
});

afterAll(async () => {
  process.env.CLAUDETREE_ROOT = originalEnv;
  await rm(testDir, { recursive: true, force: true });
});

describe('GET /api/sessions/[id]/approvals', () => {
  it('should return empty array when no approvals exist', async () => {
    const { GET } = await import('./route');
    const response = await GET(createMockRequest(), createParams('no-approvals'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return approvals for session', async () => {
    const approvalsDir = join(testDir, '.claudetree', 'approvals');
    await mkdir(approvalsDir, { recursive: true });

    const approvals = [
      createTestApproval({ id: 'a1', toolName: 'bash' }),
      createTestApproval({ id: 'a2', toolName: 'write', status: 'approved' }),
    ];
    await writeFile(
      join(approvalsDir, 'session-with-approvals.json'),
      JSON.stringify(approvals)
    );

    const { GET } = await import('./route');
    const response = await GET(
      createMockRequest(),
      createParams('session-with-approvals')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('a1');
    expect(data[1].status).toBe('approved');
  });
});
