import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
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

const createMockRequest = (body: object): Request => {
  return new Request('http://localhost:3000/api/sessions/test-id/approvals/approval-id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

const createParams = (id: string, approvalId: string) => ({
  params: Promise.resolve({ id, approvalId }),
});

let testDir: string;
let originalEnv: string | undefined;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'web-api-approval-update-test-'));
  originalEnv = process.env.CLAUDETREE_ROOT;
  process.env.CLAUDETREE_ROOT = testDir;
});

afterAll(async () => {
  process.env.CLAUDETREE_ROOT = originalEnv;
  await rm(testDir, { recursive: true, force: true });
});

describe('PATCH /api/sessions/[id]/approvals/[approvalId]', () => {
  it('should return 404 when approvals file not found', async () => {
    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockRequest({ status: 'approved' }),
      createParams('no-file', 'any-approval')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Approvals file not found');
  });

  it('should return 404 when approval not found', async () => {
    const approvalsDir = join(testDir, '.claudetree', 'approvals');
    await mkdir(approvalsDir, { recursive: true });

    const approvals = [createTestApproval({ id: 'other-approval' })];
    await writeFile(
      join(approvalsDir, 'has-approvals.json'),
      JSON.stringify(approvals)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockRequest({ status: 'approved' }),
      createParams('has-approvals', 'nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Approval not found');
  });

  it('should approve an approval successfully', async () => {
    const approvalsDir = join(testDir, '.claudetree', 'approvals');
    await mkdir(approvalsDir, { recursive: true });

    const approvals = [createTestApproval({ id: 'approve-me' })];
    await writeFile(
      join(approvalsDir, 'approve-session.json'),
      JSON.stringify(approvals)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockRequest({ status: 'approved', approvedBy: 'test-user' }),
      createParams('approve-session', 'approve-me')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approval.status).toBe('approved');
    expect(data.approval.approvedBy).toBe('test-user');
    expect(data.approval.resolvedAt).toBeDefined();

    const saved = JSON.parse(
      await readFile(join(approvalsDir, 'approve-session.json'), 'utf-8')
    );
    expect(saved[0].status).toBe('approved');
  });

  it('should reject an approval successfully', async () => {
    const approvalsDir = join(testDir, '.claudetree', 'approvals');
    await mkdir(approvalsDir, { recursive: true });

    const approvals = [createTestApproval({ id: 'reject-me' })];
    await writeFile(
      join(approvalsDir, 'reject-session.json'),
      JSON.stringify(approvals)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockRequest({ status: 'rejected' }),
      createParams('reject-session', 'reject-me')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approval.status).toBe('rejected');
  });
});
