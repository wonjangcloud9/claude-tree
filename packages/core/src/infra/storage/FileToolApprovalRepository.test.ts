import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileToolApprovalRepository } from './FileToolApprovalRepository.js';
import type { ToolApproval } from '@claudetree/shared';

describe('FileToolApprovalRepository', () => {
  let testDir: string;
  let repo: FileToolApprovalRepository;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-approval-test-'));
    repo = new FileToolApprovalRepository(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTestApproval = (
    overrides: Partial<ToolApproval> = {}
  ): ToolApproval => ({
    id: 'approval-1',
    sessionId: 'session-1',
    toolName: 'file_edit',
    parameters: { path: '/test/file.ts', content: 'test' },
    status: 'pending',
    approvedBy: null,
    requestedAt: new Date('2024-01-01T10:00:00Z'),
    resolvedAt: null,
    ...overrides,
  });

  describe('save and findBySessionId', () => {
    it('should save and retrieve an approval', async () => {
      const approval = createTestApproval();

      await repo.save(approval);
      const found = await repo.findBySessionId(approval.sessionId);

      expect(found).toHaveLength(1);
      expect(found[0]?.id).toBe(approval.id);
      expect(found[0]?.sessionId).toBe(approval.sessionId);
      expect(found[0]?.toolName).toBe(approval.toolName);
      expect(found[0]?.status).toBe('pending');
    });

    it('should return empty array for non-existent session', async () => {
      const found = await repo.findBySessionId('non-existent');
      expect(found).toEqual([]);
    });

    it('should save multiple approvals for same session', async () => {
      const approval1 = createTestApproval({ id: 'approval-1' });
      const approval2 = createTestApproval({
        id: 'approval-2',
        toolName: 'bash_exec',
      });

      await repo.save(approval1);
      await repo.save(approval2);

      const found = await repo.findBySessionId('session-1');
      expect(found).toHaveLength(2);
    });

    it('should update existing approval when saving with same id', async () => {
      const approval = createTestApproval();
      await repo.save(approval);

      const updated = { ...approval, status: 'approved' as const };
      await repo.save(updated);

      const found = await repo.findBySessionId(approval.sessionId);
      expect(found).toHaveLength(1);
      expect(found[0]?.status).toBe('approved');
    });
  });

  describe('findPending', () => {
    it('should return only pending approvals', async () => {
      const pending1 = createTestApproval({ id: 'pending-1', status: 'pending' });
      const approved = createTestApproval({ id: 'approved-1', status: 'approved' });
      const rejected = createTestApproval({ id: 'rejected-1', status: 'rejected' });
      const pending2 = createTestApproval({ id: 'pending-2', status: 'pending' });

      await repo.save(pending1);
      await repo.save(approved);
      await repo.save(rejected);
      await repo.save(pending2);

      const found = await repo.findPending('session-1');

      expect(found).toHaveLength(2);
      expect(found.map((a) => a.id).sort()).toEqual(['pending-1', 'pending-2']);
    });

    it('should return empty array when no pending approvals', async () => {
      const approval = createTestApproval({ status: 'approved' });
      await repo.save(approval);

      const found = await repo.findPending('session-1');
      expect(found).toEqual([]);
    });

    it('should return empty array for non-existent session', async () => {
      const found = await repo.findPending('non-existent');
      expect(found).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update approval status to approved', async () => {
      const approval = createTestApproval();
      await repo.save(approval);

      await repo.updateStatus(approval.id, 'approved', 'user-1');

      const found = await repo.findBySessionId(approval.sessionId);
      expect(found[0]?.status).toBe('approved');
      expect(found[0]?.approvedBy).toBe('user-1');
      expect(found[0]?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should update approval status to rejected', async () => {
      const approval = createTestApproval();
      await repo.save(approval);

      await repo.updateStatus(approval.id, 'rejected');

      const found = await repo.findBySessionId(approval.sessionId);
      expect(found[0]?.status).toBe('rejected');
      expect(found[0]?.approvedBy).toBeNull();
      expect(found[0]?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should find approval across multiple sessions', async () => {
      const approval1 = createTestApproval({
        id: 'approval-1',
        sessionId: 'session-1',
      });
      const approval2 = createTestApproval({
        id: 'approval-2',
        sessionId: 'session-2',
      });

      await repo.save(approval1);
      await repo.save(approval2);

      await repo.updateStatus('approval-2', 'approved', 'admin');

      const foundSession2 = await repo.findBySessionId('session-2');
      expect(foundSession2[0]?.status).toBe('approved');
      expect(foundSession2[0]?.approvedBy).toBe('admin');
    });

    it('should do nothing for non-existent approval id', async () => {
      await repo.updateStatus('non-existent', 'approved');
      // Should not throw, just silently succeed
    });
  });

  describe('session filtering', () => {
    it('should keep approvals separate by session', async () => {
      const session1Approval = createTestApproval({
        id: 'approval-s1',
        sessionId: 'session-1',
      });
      const session2Approval = createTestApproval({
        id: 'approval-s2',
        sessionId: 'session-2',
      });

      await repo.save(session1Approval);
      await repo.save(session2Approval);

      const session1Found = await repo.findBySessionId('session-1');
      const session2Found = await repo.findBySessionId('session-2');

      expect(session1Found).toHaveLength(1);
      expect(session1Found[0]?.id).toBe('approval-s1');

      expect(session2Found).toHaveLength(1);
      expect(session2Found[0]?.id).toBe('approval-s2');
    });
  });

  describe('date serialization', () => {
    it('should preserve requestedAt date through save/load cycle', async () => {
      const requestedAt = new Date('2024-06-15T14:30:00Z');
      const approval = createTestApproval({ requestedAt });

      await repo.save(approval);
      const found = await repo.findBySessionId(approval.sessionId);

      expect(found[0]?.requestedAt).toBeInstanceOf(Date);
      expect(found[0]?.requestedAt.toISOString()).toBe(requestedAt.toISOString());
    });

    it('should preserve resolvedAt date through save/load cycle', async () => {
      const resolvedAt = new Date('2024-06-15T15:00:00Z');
      const approval = createTestApproval({
        status: 'approved',
        resolvedAt,
      });

      await repo.save(approval);
      const found = await repo.findBySessionId(approval.sessionId);

      expect(found[0]?.resolvedAt).toBeInstanceOf(Date);
      expect(found[0]?.resolvedAt?.toISOString()).toBe(resolvedAt.toISOString());
    });

    it('should handle null resolvedAt', async () => {
      const approval = createTestApproval({ resolvedAt: null });

      await repo.save(approval);
      const found = await repo.findBySessionId(approval.sessionId);

      expect(found[0]?.resolvedAt).toBeNull();
    });
  });

  describe('file storage', () => {
    it('should create approvals directory when saving', async () => {
      const approval = createTestApproval();
      await repo.save(approval);

      const dirs = await readdir(testDir);
      expect(dirs).toContain('approvals');
    });

    it('should create separate files per session', async () => {
      await repo.save(createTestApproval({ sessionId: 'session-a' }));
      await repo.save(createTestApproval({ sessionId: 'session-b' }));

      const approvalsDir = join(testDir, 'approvals');
      const files = await readdir(approvalsDir);

      expect(files).toContain('session-a.json');
      expect(files).toContain('session-b.json');
    });
  });
});
