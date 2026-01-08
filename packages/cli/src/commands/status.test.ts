import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

// Create mock findAll that can be controlled per test
const mockFindAll = vi.fn();

// Mock FileSessionRepository
vi.mock('@claudetree/core', () => ({
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
  })),
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
      (process.exit as ReturnType<typeof vi.fn>).mockImplementation(() => {
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
              totalCostUsd: 0.02,
            },
          }),
          createMockSession({
            id: 'session-2',
            usage: {
              inputTokens: 2000,
              outputTokens: 1000,
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
