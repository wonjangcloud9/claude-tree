import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRetryManager } from './SessionRetryManager.js';
import type { Session, RetryConfig } from '@claudetree/shared';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';
import type { IEventRepository } from '../domain/repositories/IEventRepository.js';

function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session-id',
    worktreeId: 'wt-1',
    claudeSessionId: null,
    status: 'running',
    issueNumber: 42,
    prompt: 'Fix the bug',
    createdAt: new Date(),
    updatedAt: new Date(),
    processId: null,
    osProcessId: null,
    lastHeartbeat: null,
    errorCount: 0,
    worktreePath: '/tmp/wt',
    usage: null,
    progress: null,
    retryCount: 0,
    lastError: null,
    tags: [],
    ...overrides,
  };
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  backoffMultiplier: 2,
};

describe('SessionRetryManager', () => {
  let sessionRepo: ISessionRepository;
  let eventRepo: IEventRepository;
  let retryManager: SessionRetryManager;

  beforeEach(() => {
    sessionRepo = {
      findById: vi.fn(),
      findByWorktreeId: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    eventRepo = {
      findBySessionId: vi.fn(),
      append: vi.fn(),
      getLatest: vi.fn(),
      clear: vi.fn(),
    };

    retryManager = new SessionRetryManager(DEFAULT_CONFIG);
  });

  describe('shouldRetry', () => {
    it('returns true when retryCount < maxRetries', () => {
      const session = createMockSession({ retryCount: 0 });
      expect(retryManager.shouldRetry(session)).toBe(true);
    });

    it('returns true at maxRetries - 1', () => {
      const session = createMockSession({ retryCount: 2 });
      expect(retryManager.shouldRetry(session)).toBe(true);
    });

    it('returns false when retryCount >= maxRetries', () => {
      const session = createMockSession({ retryCount: 3 });
      expect(retryManager.shouldRetry(session)).toBe(false);
    });

    it('returns false when retryCount > maxRetries', () => {
      const session = createMockSession({ retryCount: 5 });
      expect(retryManager.shouldRetry(session)).toBe(false);
    });
  });

  describe('getDelay', () => {
    it('returns baseDelay for first retry', () => {
      expect(retryManager.getDelay(0)).toBe(100);
    });

    it('applies exponential backoff', () => {
      expect(retryManager.getDelay(1)).toBe(200);
      expect(retryManager.getDelay(2)).toBe(400);
      expect(retryManager.getDelay(3)).toBe(800);
    });

    it('caps at maxDelayMs', () => {
      expect(retryManager.getDelay(10)).toBe(1000);
    });
  });

  describe('executeWithRetry', () => {
    it('succeeds on first attempt without retry', async () => {
      const session = createMockSession();
      const operation = vi.fn().mockResolvedValue({ success: true });

      const result = await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'crash' })
        .mockResolvedValueOnce({ success: true });

      const result = await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('fails after exhausting all retries', async () => {
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'persistent failure' });

      const result = await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(4); // 1 initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
      expect(session.status).toBe('failed');
    });

    it('records error events for each failure', async () => {
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'err1' })
        .mockResolvedValueOnce({ success: true });

      await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      // 1 error event + 1 retry notification event
      expect(eventRepo.append).toHaveBeenCalledTimes(2);
      const errorCall = vi.mocked(eventRepo.append).mock.calls[0]![0];
      expect(errorCall.type).toBe('error');
      expect(errorCall.content).toContain('err1');
    });

    it('updates session errorCount and retryCount', async () => {
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'err' })
        .mockResolvedValueOnce({ success: true });

      await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      expect(session.errorCount).toBe(1);
      expect(session.retryCount).toBe(1);
      expect(session.lastError).toBe('err');
    });

    it('saves session state after each failure', async () => {
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'fail' });

      await retryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: DEFAULT_CONFIG,
      });

      // Save called for each failure attempt
      expect(sessionRepo.save).toHaveBeenCalledTimes(4 + 1);
      // +1 for the final status='failed' save
    });

    it('handles zero maxRetries (no retry)', async () => {
      const noRetryManager = new SessionRetryManager({
        ...DEFAULT_CONFIG,
        maxRetries: 0,
      });
      const session = createMockSession();
      const operation = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'fail' });

      const result = await noRetryManager.executeWithRetry(operation, {
        session,
        sessionRepo,
        eventRepo,
        retryConfig: { ...DEFAULT_CONFIG, maxRetries: 0 },
      });

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
