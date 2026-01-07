import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileCodeReviewRepository } from './FileCodeReviewRepository.js';
import type { CodeReview, FileChange } from '@claudetree/shared';

describe('FileCodeReviewRepository', () => {
  let testDir: string;
  let repo: FileCodeReviewRepository;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-review-test-'));
    repo = new FileCodeReviewRepository(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTestReview = (overrides: Partial<CodeReview> = {}): CodeReview => {
    const changes: FileChange[] = [
      { path: 'src/index.ts', additions: 10, deletions: 5, status: 'modified' },
    ];
    return {
      id: 'review-1',
      sessionId: 'session-1',
      status: 'pending',
      comment: null,
      changes,
      requestedAt: new Date('2024-01-01T10:00:00Z'),
      resolvedAt: null,
      ...overrides,
    };
  };

  describe('save and findBySessionId', () => {
    it('should save and retrieve a code review', async () => {
      const review = createTestReview();

      await repo.save(review);
      const found = await repo.findBySessionId(review.sessionId);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(review.id);
      expect(found?.sessionId).toBe(review.sessionId);
      expect(found?.status).toBe(review.status);
      expect(found?.changes).toEqual(review.changes);
    });

    it('should return null for non-existent session', async () => {
      const found = await repo.findBySessionId('non-existent');
      expect(found).toBeNull();
    });

    it('should serialize/deserialize dates correctly', async () => {
      const review = createTestReview({
        requestedAt: new Date('2024-06-15T12:30:00Z'),
        resolvedAt: new Date('2024-06-15T14:00:00Z'),
      });

      await repo.save(review);
      const found = await repo.findBySessionId(review.sessionId);

      expect(found?.requestedAt).toBeInstanceOf(Date);
      expect(found?.resolvedAt).toBeInstanceOf(Date);
      expect(found?.requestedAt.toISOString()).toBe('2024-06-15T12:30:00.000Z');
      expect(found?.resolvedAt?.toISOString()).toBe('2024-06-15T14:00:00.000Z');
    });

    it('should handle null resolvedAt', async () => {
      const review = createTestReview({ resolvedAt: null });

      await repo.save(review);
      const found = await repo.findBySessionId(review.sessionId);

      expect(found?.resolvedAt).toBeNull();
    });

    it('should create reviews directory if not exists', async () => {
      const review = createTestReview();
      await repo.save(review);

      const filePath = join(testDir, 'reviews', `${review.sessionId}.json`);
      const content = await readFile(filePath, 'utf-8');
      expect(content).toBeTruthy();
    });
  });

  describe('updateStatus', () => {
    it('should update review status', async () => {
      const review = createTestReview();
      await repo.save(review);

      await repo.updateStatus(review.id, 'approved');

      const found = await repo.findBySessionId(review.sessionId);
      expect(found?.status).toBe('approved');
      expect(found?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should update review with comment', async () => {
      const review = createTestReview();
      await repo.save(review);

      await repo.updateStatus(review.id, 'changes_requested', 'Please fix tests');

      const found = await repo.findBySessionId(review.sessionId);
      expect(found?.status).toBe('changes_requested');
      expect(found?.comment).toBe('Please fix tests');
    });

    it('should preserve existing comment if not provided', async () => {
      const review = createTestReview({ comment: 'Initial comment' });
      await repo.save(review);

      await repo.updateStatus(review.id, 'approved');

      const found = await repo.findBySessionId(review.sessionId);
      expect(found?.comment).toBe('Initial comment');
    });

    it('should not throw for non-existent review id', async () => {
      await expect(
        repo.updateStatus('non-existent-id', 'approved')
      ).resolves.not.toThrow();
    });
  });

  describe('session filtering', () => {
    it('should find correct review by session id among multiple reviews', async () => {
      const review1 = createTestReview({ id: 'r1', sessionId: 'session-1' });
      const review2 = createTestReview({ id: 'r2', sessionId: 'session-2' });
      const review3 = createTestReview({ id: 'r3', sessionId: 'session-3' });

      await repo.save(review1);
      await repo.save(review2);
      await repo.save(review3);

      const found = await repo.findBySessionId('session-2');

      expect(found?.id).toBe('r2');
      expect(found?.sessionId).toBe('session-2');
    });

    it('should update correct review when multiple exist', async () => {
      const review1 = createTestReview({ id: 'r1', sessionId: 'session-1' });
      const review2 = createTestReview({ id: 'r2', sessionId: 'session-2' });

      await repo.save(review1);
      await repo.save(review2);

      await repo.updateStatus('r2', 'approved', 'LGTM');

      const found1 = await repo.findBySessionId('session-1');
      const found2 = await repo.findBySessionId('session-2');

      expect(found1?.status).toBe('pending');
      expect(found2?.status).toBe('approved');
      expect(found2?.comment).toBe('LGTM');
    });
  });

  describe('file system error handling', () => {
    it('should return null when reading from invalid directory', async () => {
      const invalidRepo = new FileCodeReviewRepository('/invalid/path/that/does/not/exist');
      const found = await invalidRepo.findBySessionId('any-session');
      expect(found).toBeNull();
    });

    it('should handle corrupted JSON gracefully', async () => {
      const review = createTestReview();
      await repo.save(review);

      const filePath = join(testDir, 'reviews', `${review.sessionId}.json`);
      const { writeFile } = await import('node:fs/promises');
      await writeFile(filePath, 'invalid json content');

      const found = await repo.findBySessionId(review.sessionId);
      expect(found).toBeNull();
    });
  });

  describe('overwrite behavior', () => {
    it('should overwrite existing review for same session', async () => {
      const review1 = createTestReview({ comment: 'First version' });
      const review2 = createTestReview({ comment: 'Updated version' });

      await repo.save(review1);
      await repo.save(review2);

      const found = await repo.findBySessionId(review1.sessionId);
      expect(found?.comment).toBe('Updated version');
    });
  });
});
