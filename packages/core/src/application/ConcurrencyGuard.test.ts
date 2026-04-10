import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConcurrencyGuard } from './ConcurrencyGuard.js';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';

describe('ConcurrencyGuard', () => {
  let sessionRepo: ISessionRepository;

  beforeEach(() => {
    sessionRepo = {
      findById: vi.fn(),
      findByWorktreeId: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('check', () => {
    it('allows when under limit', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([
        { status: 'running' },
        { status: 'completed' },
      ] as never);

      const guard = new ConcurrencyGuard(sessionRepo, 5);
      const result = await guard.check();

      expect(result.allowed).toBe(true);
      expect(result.running).toBe(1);
      expect(result.limit).toBe(5);
    });

    it('blocks when at limit', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([
        { status: 'running' },
        { status: 'running' },
        { status: 'pending' },
      ] as never);

      const guard = new ConcurrencyGuard(sessionRepo, 3);
      const result = await guard.check();

      expect(result.allowed).toBe(false);
      expect(result.running).toBe(3);
    });

    it('counts pending as running', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([
        { status: 'pending' },
        { status: 'pending' },
      ] as never);

      const guard = new ConcurrencyGuard(sessionRepo, 2);
      const result = await guard.check();

      expect(result.allowed).toBe(false);
      expect(result.running).toBe(2);
    });

    it('ignores completed and failed sessions', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([
        { status: 'completed' },
        { status: 'failed' },
        { status: 'paused' },
      ] as never);

      const guard = new ConcurrencyGuard(sessionRepo, 1);
      const result = await guard.check();

      expect(result.allowed).toBe(true);
      expect(result.running).toBe(0);
    });
  });

  describe('waitForSlot', () => {
    it('returns true immediately when slot available', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([]);

      const guard = new ConcurrencyGuard(sessionRepo, 5);
      const result = await guard.waitForSlot(100, 1000);

      expect(result).toBe(true);
    });

    it('returns false on timeout', async () => {
      vi.mocked(sessionRepo.findAll).mockResolvedValue([
        { status: 'running' },
      ] as never);

      const guard = new ConcurrencyGuard(sessionRepo, 1);
      const result = await guard.waitForSlot(50, 150);

      expect(result).toBe(false);
    });
  });
});
