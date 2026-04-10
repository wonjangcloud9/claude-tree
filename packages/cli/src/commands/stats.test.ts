import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
  })),
}));

import { statsCommand } from './stats.js';

describe('statsCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-stats-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should have correct command name', () => {
    expect(statsCommand.name()).toBe('stats');
  });

  it('should have a description', () => {
    expect(statsCommand.description()).toBeTruthy();
  });

  it('should have --json option', () => {
    const jsonOption = statsCommand.options.find((o) => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });

  it('should have an action handler', () => {
    // Commander stores the action listener internally
    expect(typeof (statsCommand as unknown as Record<string, unknown>)._actionHandler).toBe('function');
  });

  describe('when not initialized', () => {
    it('should display error and exit with code 1', async () => {
      const exitError = new Error('process.exit called');
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw exitError;
      });

      await expect(
        statsCommand.parseAsync(['node', 'test'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: claudetree not initialized. Run "claudetree init" first.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
    });

    const createMockSession = (overrides: Partial<Session> = {}): Session => ({
      id: 'test-session-id-123',
      worktreeId: 'worktree-id-456',
      claudeSessionId: null,
      status: 'completed',
      issueNumber: null,
      prompt: null,
      createdAt: new Date('2026-03-27T10:00:00Z'),
      updatedAt: new Date('2026-03-27T10:15:00Z'),
      processId: null,
      osProcessId: null,
      lastHeartbeat: null,
      errorCount: 0,
      worktreePath: null,
      usage: {
        inputTokens: 50000,
        outputTokens: 20000,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        totalCostUsd: 1.25,
      },
      progress: null,
      retryCount: 0,
      lastError: null,
      tags: [],
      ...overrides,
    });

    it('should display "No sessions found" when empty', async () => {
      mockFindAll.mockResolvedValue([]);
      await statsCommand.parseAsync(['node', 'test']);
      expect(consoleLogSpy).toHaveBeenCalledWith('No sessions found.');
    });

    it('should display statistics summary', async () => {
      mockFindAll.mockResolvedValue([
        createMockSession({ id: 's1', status: 'completed' }),
        createMockSession({ id: 's2', status: 'failed' }),
      ]);

      await statsCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Statistics')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 total')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('50.0%')
      );
    });

    it('should output JSON with --json flag', async () => {
      mockFindAll.mockResolvedValue([createMockSession()]);
      await statsCommand.parseAsync(['node', 'test', '--json']);

      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.totalSessions).toBe(1);
      expect(parsed.totalCostUsd).toBeCloseTo(1.25);
      expect(parsed.dailyStats).toBeDefined();
    });

    it('should show cost and token info', async () => {
      mockFindAll.mockResolvedValue([createMockSession()]);
      await statsCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('$1.25')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('50.0K')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('20.0K')
      );
    });

    it('should show average duration', async () => {
      mockFindAll.mockResolvedValue([createMockSession()]);
      await statsCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('15 min')
      );
    });
  });
});
