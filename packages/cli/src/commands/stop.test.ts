import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

// Create mock functions
const mockFindAll = vi.fn();
const mockSave = vi.fn();

// Mock FileSessionRepository
vi.mock('@claudetree/core', () => ({
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
    save: mockSave,
  })),
}));

// Import after mock
import { stopCommand } from './stop.js';

describe('stopCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'test-session-id-123',
    worktreeId: 'worktree-id-456',
    claudeSessionId: null,
    status: 'running',
    issueNumber: 42,
    prompt: 'Fix the bug',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    processId: null,
    osProcessId: null,
    lastHeartbeat: null,
    errorCount: 0,
    worktreePath: '/path/to/worktree',
    usage: null,
    progress: null,
    ...overrides,
  });

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-stop-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockSave.mockReset();
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
      const exitError = new Error('process.exit called');
      (process.exit as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw exitError;
      });

      await expect(stopCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

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

        await stopCommand.parseAsync(['node', 'test']);

        expect(consoleLogSpy).toHaveBeenCalledWith('No active sessions.');
      });
    });

    describe('with session-id argument', () => {
      it('should stop matching session by ID prefix', async () => {
        const session = createMockSession({ id: 'test-session-abc123' });
        mockFindAll.mockResolvedValue([session]);
        mockSave.mockResolvedValue(undefined);

        await stopCommand.parseAsync(['node', 'test', 'test-ses']);

        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-session-abc123',
            status: 'completed',
          })
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Stopping session: test-ses')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Stopped 1 session(s)')
        );
      });

      it('should error when no matching session found', async () => {
        const session = createMockSession({ id: 'test-session-abc123' });
        mockFindAll.mockResolvedValue([session]);
        const exitError = new Error('process.exit called');
        (process.exit as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          stopCommand.parseAsync(['node', 'test', 'nonexistent'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'No session found matching: nonexistent'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('with --all option', () => {
      it('should stop all sessions', async () => {
        const sessions = [
          createMockSession({ id: 'session-1' }),
          createMockSession({ id: 'session-2' }),
          createMockSession({ id: 'session-3' }),
        ];
        mockFindAll.mockResolvedValue(sessions);
        mockSave.mockResolvedValue(undefined);

        await stopCommand.parseAsync(['node', 'test', '--all']);

        expect(mockSave).toHaveBeenCalledTimes(3);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Stopped 3 session(s)')
        );
      });
    });

    describe('session status update', () => {
      it('should update session status to completed', async () => {
        const session = createMockSession({
          id: 'test-session',
          status: 'running',
        });
        mockFindAll.mockResolvedValue([session]);
        mockSave.mockResolvedValue(undefined);

        await stopCommand.parseAsync(['node', 'test', 'test']);

        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'completed',
          })
        );
      });

      it('should update the updatedAt timestamp', async () => {
        const originalDate = new Date('2024-01-01');
        const session = createMockSession({
          id: 'test-session',
          updatedAt: originalDate,
        });
        mockFindAll.mockResolvedValue([session]);
        mockSave.mockResolvedValue(undefined);

        await stopCommand.parseAsync(['node', 'test', 'test']);

        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            updatedAt: expect.any(Date),
          })
        );
        const savedSession = mockSave.mock.calls[0]![0] as Session;
        expect(savedSession.updatedAt.getTime()).toBeGreaterThan(
          originalDate.getTime()
        );
      });
    });
  });
});
