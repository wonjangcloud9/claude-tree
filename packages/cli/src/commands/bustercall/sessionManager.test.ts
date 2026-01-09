import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { getSessionsForIssue, waitForSessionCreated } from './sessionManager.js';

vi.mock('node:fs/promises');

describe('sessionManager', () => {
  describe('getSessionsForIssue', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return sessions matching issue number', async () => {
      const mockSessions = [
        { id: '1', issueNumber: 42, status: 'running' },
        { id: '2', issueNumber: 43, status: 'completed' },
        { id: '3', issueNumber: 42, status: 'completed' },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSessions));

      const result = await getSessionsForIssue('/test/cwd', 42);

      expect(result).toHaveLength(2);
      expect(result[0]?.issueNumber).toBe(42);
      expect(result[1]?.issueNumber).toBe(42);
    });

    it('should return empty array when no sessions match', async () => {
      const mockSessions = [
        { id: '1', issueNumber: 1, status: 'running' },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSessions));

      const result = await getSessionsForIssue('/test/cwd', 999);

      expect(result).toHaveLength(0);
    });

    it('should return empty array on file read error', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await getSessionsForIssue('/test/cwd', 42);

      expect(result).toHaveLength(0);
    });
  });

  describe('waitForSessionCreated', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true when running session is found', async () => {
      const mockSessions = [
        { id: '1', issueNumber: 42, status: 'running' },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSessions));

      const promise = waitForSessionCreated('/test/cwd', 42, 5000);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should return false on timeout', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([]));

      const promise = waitForSessionCreated('/test/cwd', 42, 3000);

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(4000);

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should poll until session is found', async () => {
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '1', issueNumber: 42, status: 'running' }]));

      const promise = waitForSessionCreated('/test/cwd', 42, 10000);

      // First poll at 0ms
      await vi.advanceTimersByTimeAsync(1000);
      // Second poll at 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      // Third poll at 2000ms - should find session
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toBe(true);
    });
  });
});
