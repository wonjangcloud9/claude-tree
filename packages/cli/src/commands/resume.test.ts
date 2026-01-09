import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

// Mock FileSessionRepository, FileEventRepository, and ClaudeSessionAdapter
const mockFindAll = vi.fn();
const mockSave = vi.fn();
const mockEventAppend = vi.fn();
const mockResume = vi.fn();
const mockGetOutput = vi.fn();
const mockOn = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
    save: mockSave,
  })),
  FileEventRepository: vi.fn().mockImplementation(() => ({
    append: mockEventAppend,
  })),
  ClaudeSessionAdapter: vi.fn().mockImplementation(() => ({
    resume: mockResume,
    getOutput: mockGetOutput,
    on: mockOn,
  })),
}));

import { resumeCommand } from './resume.js';

describe('resumeCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'test-session-id-12345678',
    worktreeId: 'worktree-id-456',
    claudeSessionId: 'claude-session-123',
    status: 'paused',
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
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-resume-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockSave.mockReset();
    mockEventAppend.mockReset();
    mockResume.mockReset();
    mockGetOutput.mockReset();
    mockOn.mockReset();
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
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw exitError;
      });

      await expect(
        resumeCommand.parseAsync(['node', 'test', 'test-ses'])
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

    describe('when no matching session found', () => {
      it('should display error and exit with code 1', async () => {
        mockFindAll.mockResolvedValue([
          createMockSession({ id: 'other-session-id', status: 'completed' }),
        ]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'nonexistent'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'No resumable session found matching: nonexistent'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });

      it('should list resumable sessions when no match', async () => {
        const pausedSession = createMockSession({
          id: 'paused-session-123',
          status: 'paused',
          issueNumber: 42,
        });
        mockFindAll.mockResolvedValue([pausedSession]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'nonexistent'])
        ).rejects.toThrow('process.exit called');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '\nResumable sessions (paused/running):'
        );
      });
    });

    describe('when session has no Claude session ID', () => {
      it('should display error and exit with code 1', async () => {
        const session = createMockSession({
          id: 'test-session-123',
          claudeSessionId: null,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'test-ses'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error: Session has no Claude session ID. Cannot resume.'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('when session has no worktree path', () => {
      it('should display error and exit with code 1', async () => {
        const session = createMockSession({
          id: 'test-session-123',
          claudeSessionId: 'claude-123',
          worktreePath: null,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'test-ses'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error: Session has no worktree path. Cannot resume.'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('when worktree does not exist', () => {
      it('should display error and exit with code 1', async () => {
        const session = createMockSession({
          id: 'test-session-123',
          claudeSessionId: 'claude-123',
          worktreePath: '/nonexistent/path',
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'test-ses'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error: Worktree no longer exists: /nonexistent/path'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('when session can be resumed', () => {
      let worktreePath: string;

      beforeEach(async () => {
        worktreePath = join(testDir, 'worktree');
        await mkdir(worktreePath, { recursive: true });
      });

      it('should find session by ID prefix', async () => {
        const session = createMockSession({
          id: 'test-session-abc12345',
          claudeSessionId: 'claude-123',
          worktreePath,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        // Mock getOutput to return async iterator
        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'test-ses']);

        expect(mockResume).toHaveBeenCalledWith(
          'claude-123',
          'Continue from where you left off.'
        );
      });

      it('should use custom prompt with --prompt option', async () => {
        const session = createMockSession({
          id: 'test-session-abc12345',
          claudeSessionId: 'claude-123',
          worktreePath,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync([
          'node',
          'test',
          'test-ses',
          '--prompt',
          'Continue with the tests',
        ]);

        expect(mockResume).toHaveBeenCalledWith(
          'claude-123',
          'Continue with the tests'
        );
      });

      it('should update session with process info', async () => {
        const session = createMockSession({
          id: 'test-session-abc12345',
          claudeSessionId: 'claude-123',
          worktreePath,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'test-ses']);

        // Check that save was called with processId and osProcessId
        expect(mockSave).toHaveBeenCalled();
        const savedSession = mockSave.mock.calls[0][0];
        expect(savedSession.processId).toBe('proc-1');
        expect(savedSession.osProcessId).toBe(12345);
      });

      it('should mark session as completed when done', async () => {
        const session = createMockSession({
          id: 'test-session-abc12345',
          claudeSessionId: 'claude-123',
          worktreePath,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'new-session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'test-ses']);

        // Last save should be completed
        const lastSaveCall = mockSave.mock.calls[mockSave.mock.calls.length - 1];
        expect(lastSaveCall[0].status).toBe('completed');
      });

      it('should display output logs', async () => {
        const session = createMockSession({
          id: 'test-session-abc12345',
          claudeSessionId: 'claude-123',
          worktreePath,
          status: 'paused',
        });
        mockFindAll.mockResolvedValue([session]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'text', content: 'Working on the task...' };
            yield { type: 'tool_use', content: 'Reading file' };
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'test-ses']);

        expect(consoleLogSpy).toHaveBeenCalledWith('Working on the task...');
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Tool]')
        );
      });
    });

    describe('session matching', () => {
      it('should match paused sessions', async () => {
        const pausedSession = createMockSession({
          id: 'paused-session-123',
          status: 'paused',
          worktreePath: testDir,
        });
        await mkdir(testDir, { recursive: true });
        mockFindAll.mockResolvedValue([pausedSession]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'paused']);

        expect(mockResume).toHaveBeenCalled();
      });

      it('should match running sessions', async () => {
        const runningSession = createMockSession({
          id: 'running-session-123',
          status: 'running',
          worktreePath: testDir,
        });
        mockFindAll.mockResolvedValue([runningSession]);
        mockResume.mockResolvedValue({
          processId: 'proc-1',
          osProcessId: 12345,
        });

        mockGetOutput.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'done', content: 'session-id' };
          },
        });

        await resumeCommand.parseAsync(['node', 'test', 'running']);

        expect(mockResume).toHaveBeenCalled();
      });

      it('should not match completed sessions', async () => {
        const completedSession = createMockSession({
          id: 'completed-session-123',
          status: 'completed',
        });
        mockFindAll.mockResolvedValue([completedSession]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'completed'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('No resumable session found')
        );
      });

      it('should not match failed sessions', async () => {
        const failedSession = createMockSession({
          id: 'failed-session-123',
          status: 'failed',
        });
        mockFindAll.mockResolvedValue([failedSession]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          resumeCommand.parseAsync(['node', 'test', 'failed'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('No resumable session found')
        );
      });
    });
  });
});
