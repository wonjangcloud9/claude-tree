import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSessionRepository } from './FileSessionRepository.js';
import type { Session } from '@claudetree/shared';

describe('FileSessionRepository', () => {
  let testDir: string;
  let repo: FileSessionRepository;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-session-test-'));
    repo = new FileSessionRepository(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTestSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'test-session-1',
    worktreeId: 'worktree-1',
    claudeSessionId: null,
    status: 'pending',
    issueNumber: null,
    prompt: 'Test prompt',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('save and findById', () => {
    it('should save and retrieve a session', async () => {
      const session = createTestSession();

      await repo.save(session);
      const found = await repo.findById(session.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(session.id);
      expect(found?.worktreeId).toBe(session.worktreeId);
      expect(found?.status).toBe(session.status);
    });

    it('should return null for non-existent session', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByWorktreeId', () => {
    it('should find session by worktree id', async () => {
      const session = createTestSession({ worktreeId: 'wt-123' });
      await repo.save(session);

      const found = await repo.findByWorktreeId('wt-123');

      expect(found).not.toBeNull();
      expect(found?.worktreeId).toBe('wt-123');
    });
  });

  describe('findAll', () => {
    it('should return all sessions', async () => {
      await repo.save(createTestSession({ id: 's1' }));
      await repo.save(createTestSession({ id: 's2' }));
      await repo.save(createTestSession({ id: 's3' }));

      const all = await repo.findAll();

      expect(all).toHaveLength(3);
    });

    it('should return empty array when no sessions', async () => {
      const all = await repo.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      const session = createTestSession();
      await repo.save(session);

      await repo.delete(session.id);

      const found = await repo.findById(session.id);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update existing session', async () => {
      const session = createTestSession();
      await repo.save(session);

      const updated = { ...session, status: 'running' as const };
      await repo.save(updated);

      const found = await repo.findById(session.id);
      expect(found?.status).toBe('running');
    });
  });
});
