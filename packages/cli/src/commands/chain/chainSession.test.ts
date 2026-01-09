import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { loadSessions, saveChain, waitForSession } from './chainSession.js';
import type { Chain } from '@claudetree/shared';

vi.mock('node:fs/promises');

describe('chainSession', () => {
  describe('loadSessions', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should load and parse sessions file', async () => {
      const mockSessions = [
        { id: '1', issueNumber: 42, status: 'running', worktreePath: '/path/1' },
        { id: '2', issueNumber: 43, status: 'completed', worktreePath: '/path/2' },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSessions));

      const result = await loadSessions('/test/cwd');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('1');
      expect(result[1]?.id).toBe('2');
    });

    it('should return empty array on file read error', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await loadSessions('/test/cwd');

      expect(result).toHaveLength(0);
    });
  });

  describe('saveChain', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should create directory and save chain file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const chain: Chain = {
        id: 'test-123',
        items: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        options: { baseBranch: 'develop', skipFailed: false, autoMerge: false },
      };

      await saveChain('/test/cwd', chain);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('chains'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-123.json'),
        expect.any(String)
      );
    });
  });

  describe('waitForSession', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return success when session completes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify([{ id: 'sess-1', issueNumber: 42, status: 'completed' }])
      );

      const promise = waitForSession('/test/cwd', 42, 10000);
      await vi.advanceTimersByTimeAsync(3000);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('sess-1');
    });

    it('should return failure when session fails', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify([{ id: 'sess-1', issueNumber: 42, status: 'failed' }])
      );

      const promise = waitForSession('/test/cwd', 42, 10000);
      await vi.advanceTimersByTimeAsync(3000);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session failed');
    });

    it('should return timeout error when no session found', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([]));

      const promise = waitForSession('/test/cwd', 42, 5000);
      await vi.advanceTimersByTimeAsync(6000);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session timeout');
    });

    it('should poll until session status changes', async () => {
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify([{ id: 's1', issueNumber: 42, status: 'running' }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: 's1', issueNumber: 42, status: 'running' }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: 's1', issueNumber: 42, status: 'completed' }]));

      const promise = waitForSession('/test/cwd', 42, 30000);

      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(3000);

      const result = await promise;
      expect(result.success).toBe(true);
    });
  });
});
