import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

// Create mock findAll that can be controlled per test
const mockFindAll = vi.fn();

// Mock FileSessionRepository and ClaudeSessionAdapter
vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
    save = vi.fn();
  },
  ClaudeSessionAdapter: class {
    isProcessAlive = vi.fn().mockReturnValue(false);
  },
}));

// Import after mock
import { statusCommand } from './status.js';

describe('statusCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-status-test-'));
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

  describe('when not initialized', () => {
    it('should display error and exit with code 1', async () => {
      // Mock process.exit to throw to stop execution
      const exitError = new Error('process.exit called');
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw exitError;
      });

      await expect(
        statusCommand.parseAsync(['node', 'test'])
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

    describe('when no sessions exist', () => {
      it('should display "No active sessions" message', async () => {
        mockFindAll.mockResolvedValue([]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith('No active sessions.');
      });
    });

    describe('when sessions exist', () => {
      const createMockSession = (overrides: Partial<Session> = {}): Session => ({
        id: 'test-session-id-123',
        worktreeId: 'worktree-id-456',
        claudeSessionId: null,
        status: 'running',
        issueNumber: 42,
        prompt: 'Fix the bug in authentication',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        processId: null,
        osProcessId: null,
        lastHeartbeat: null,
        errorCount: 0,
        worktreePath: '/path/to/worktree',
        usage: null,
        progress: null,
        retryCount: 0,
        lastError: null,
        tags: [],
        ...overrides,
      });

      it('should display session details', async () => {
        const session = createMockSession();
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith('Sessions:\n');
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('test-ses')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('running')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Issue #42')
        );
      });

      it('should display truncated prompt if too long', async () => {
        const session = createMockSession({
          prompt:
            'This is a very long prompt that should be truncated because it exceeds the maximum display length',
        });
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('...')
        );
      });

      it('should display usage information when available', async () => {
        const session = createMockSession({
          usage: {
            inputTokens: 1000,
            outputTokens: 500,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            totalCostUsd: 0.0234,
          },
        });
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('1,000')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('500')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('0.0234')
        );
      });

      it('should display progress bar for running sessions', async () => {
        const session = createMockSession({
          status: 'running',
          progress: {
            currentStep: 'implementing',
            completedSteps: ['analyzing'],
            startedAt: new Date(),
          },
        });
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Implementing')
        );
      });

      it('should show total cost summary when multiple sessions have usage', async () => {
        const sessions = [
          createMockSession({
            id: 'session-1',
            usage: {
              inputTokens: 1000,
              outputTokens: 500,
              cacheReadInputTokens: 0,
              cacheCreationInputTokens: 0,
              totalCostUsd: 0.02,
            },
          }),
          createMockSession({
            id: 'session-2',
            usage: {
              inputTokens: 2000,
              outputTokens: 1000,
              cacheReadInputTokens: 0,
              cacheCreationInputTokens: 0,
              totalCostUsd: 0.04,
            },
          }),
        ];
        mockFindAll.mockResolvedValue(sessions);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Total:')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('0.06')
        );
      });
    });

    describe('with --state filter', () => {
      const createMockSession = (overrides: Partial<Session> = {}): Session => ({
        id: 'test-session-id-123',
        worktreeId: 'worktree-id-456',
        claudeSessionId: null,
        status: 'running',
        issueNumber: null,
        prompt: null,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        processId: null,
        osProcessId: null,
        lastHeartbeat: null,
        errorCount: 0,
        worktreePath: null,
        usage: null,
        progress: null,
        retryCount: 0,
        lastError: null,
        tags: [],
        ...overrides,
      });

      it('should filter sessions by status', async () => {
        const sessions = [
          createMockSession({ id: 'running-1', status: 'running' }),
          createMockSession({ id: 'completed-1', status: 'completed' }),
          createMockSession({ id: 'failed-1', status: 'failed' }),
        ];
        mockFindAll.mockResolvedValue(sessions);

        await statusCommand.parseAsync(['node', 'test', '--state', 'completed']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('complete'),
        );
        // Should NOT show running or failed sessions
        const allCalls = consoleLogSpy.mock.calls.flat().join(' ');
        expect(allCalls).not.toContain('running-1');
        expect(allCalls).not.toContain('failed-1');
      });

      it('should show error for invalid state', async () => {
        mockFindAll.mockResolvedValue([]);

        await statusCommand.parseAsync(['node', 'test', '--state', 'invalid']);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid state'),
        );
      });
    });

    describe('duration display', () => {
      it('should display duration for completed sessions', async () => {
        const session = {
          id: 'test-session-id-123',
          worktreeId: 'worktree-id-456',
          claudeSessionId: null,
          status: 'completed' as const,
          issueNumber: null,
          prompt: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:05:30Z'),
          processId: null,
          osProcessId: null,
          lastHeartbeat: null,
          errorCount: 0,
          worktreePath: null,
          usage: null,
          progress: null,
          retryCount: 0,
          lastError: null,
          tags: [],
        };
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Duration: 5m 30s'),
        );
      });
    });

    describe('with --json option', () => {
      it('should output sessions as JSON', async () => {
        const session = {
          id: 'test-session-id',
          worktreeId: 'worktree-id',
          status: 'running',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        };
        mockFindAll.mockResolvedValue([session]);

        await statusCommand.parseAsync(['node', 'test', '--json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          JSON.stringify([session], null, 2)
        );
      });
    });
  });
});
