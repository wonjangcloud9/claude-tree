import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock readline
const mockQuestion = vi.fn();
const mockRlClose = vi.fn();
vi.mock('node:readline', () => ({
  createInterface: () => ({
    question: mockQuestion,
    close: mockRlClose,
  }),
}));

// Mock GitWorktreeAdapter
const mockWorktreeList = vi.fn();
const mockWorktreeRemove = vi.fn();
const mockWorktreePrune = vi.fn();
const mockSessionFindAll = vi.fn();
const mockSessionDelete = vi.fn();

vi.mock('@claudetree/core', () => ({
  GitWorktreeAdapter: vi.fn().mockImplementation(() => ({
    list: mockWorktreeList,
    remove: mockWorktreeRemove,
    prune: mockWorktreePrune,
  })),
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockSessionFindAll,
    delete: mockSessionDelete,
  })),
}));

import { cleanCommand } from './clean.js';

describe('cleanCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-clean-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    mockWorktreeList.mockReset();
    mockWorktreeRemove.mockReset();
    mockWorktreePrune.mockReset();
    mockSessionFindAll.mockReset();
    mockSessionDelete.mockReset();
    mockQuestion.mockReset();
    mockRlClose.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('when no worktrees to remove', () => {
    it('should display message and return', async () => {
      mockWorktreeList.mockResolvedValue([
        { path: '/main', branch: 'main', isMainWorktree: true },
      ]);

      await cleanCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith('No worktrees to remove.');
      expect(mockWorktreeRemove).not.toHaveBeenCalled();
    });
  });

  describe('when worktrees exist', () => {
    beforeEach(() => {
      mockWorktreeList.mockResolvedValue([
        { path: '/main', branch: 'main', isMainWorktree: true },
        { path: '/worktree-1', branch: 'feature-1', isMainWorktree: false },
        { path: '/worktree-2', branch: 'feature-2', isMainWorktree: false },
      ]);
      mockSessionFindAll.mockResolvedValue([]);
      mockWorktreePrune.mockResolvedValue(undefined);
    });

    describe('with --dry-run option', () => {
      it('should show worktrees without removing', async () => {
        await cleanCommand.parseAsync(['node', 'test', '--dry-run']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Found 2 worktree(s) to remove')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith('\n[Dry run] No changes made.');
        expect(mockWorktreeRemove).not.toHaveBeenCalled();
      });
    });

    describe('with --force option', () => {
      it('should remove worktrees without confirmation', async () => {
        mockWorktreeRemove.mockResolvedValue(undefined);

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        expect(mockQuestion).not.toHaveBeenCalled();
        expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
        expect(mockWorktreeRemove).toHaveBeenCalledWith('/worktree-1', true);
        expect(mockWorktreeRemove).toHaveBeenCalledWith('/worktree-2', true);
      });

      it('should report success count', async () => {
        mockWorktreeRemove.mockResolvedValue(undefined);

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Removed 2 worktree(s) successfully')
        );
      });

      it('should handle removal errors gracefully', async () => {
        mockWorktreeRemove
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Permission denied'));

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Removed 1 worktree(s) successfully')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to remove 1 worktree(s)')
        );
      });
    });

    describe('without --force option', () => {
      it('should ask for confirmation', async () => {
        mockQuestion.mockImplementation(
          (
            _msg: string,
            cb: (answer: string) => void
          ) => {
            cb('n');
          }
        );

        await cleanCommand.parseAsync(['node', 'test']);

        expect(mockQuestion).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('Cancelled.');
        expect(mockWorktreeRemove).not.toHaveBeenCalled();
      });

      it('should remove on confirmation (y)', async () => {
        mockQuestion.mockImplementation(
          (
            _msg: string,
            cb: (answer: string) => void
          ) => {
            cb('y');
          }
        );
        mockWorktreeRemove.mockResolvedValue(undefined);

        await cleanCommand.parseAsync(['node', 'test']);

        expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
      });

      it('should remove on confirmation (yes)', async () => {
        mockQuestion.mockImplementation(
          (
            _msg: string,
            cb: (answer: string) => void
          ) => {
            cb('yes');
          }
        );
        mockWorktreeRemove.mockResolvedValue(undefined);

        await cleanCommand.parseAsync(['node', 'test']);

        expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
      });
    });

    describe('session cleanup', () => {
      it('should delete sessions for removed worktrees', async () => {
        await mkdir(join(testDir, '.claudetree'), { recursive: true });
        mockWorktreeRemove.mockResolvedValue(undefined);
        mockSessionFindAll.mockResolvedValue([
          { id: 'session-1', worktreePath: '/worktree-1' },
          { id: 'session-2', worktreePath: '/worktree-2' },
          { id: 'session-3', worktreePath: '/other-path' },
        ]);

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        expect(mockSessionDelete).toHaveBeenCalledTimes(2);
        expect(mockSessionDelete).toHaveBeenCalledWith('session-1');
        expect(mockSessionDelete).toHaveBeenCalledWith('session-2');
      });

      it('should not delete sessions with --keep-sessions', async () => {
        mockWorktreeRemove.mockResolvedValue(undefined);
        mockSessionFindAll.mockResolvedValue([
          { id: 'session-1', worktreePath: '/worktree-1' },
        ]);

        await cleanCommand.parseAsync(['node', 'test', '--force', '--keep-sessions']);

        expect(mockSessionDelete).not.toHaveBeenCalled();
      });
    });

    describe('prune operation', () => {
      it('should prune stale entries after removal', async () => {
        mockWorktreeRemove.mockResolvedValue(undefined);

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        expect(mockWorktreePrune).toHaveBeenCalled();
      });

      it('should handle prune errors gracefully', async () => {
        mockWorktreeRemove.mockResolvedValue(undefined);
        mockWorktreePrune.mockRejectedValue(new Error('Prune failed'));

        await cleanCommand.parseAsync(['node', 'test', '--force']);

        // Should not throw, prune failure is handled
        expect(stdoutWriteSpy).toHaveBeenCalledWith(
          expect.stringContaining('Pruning stale entries')
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle list errors', async () => {
      mockWorktreeList.mockRejectedValue(new Error('List failed'));
      (process.exit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(cleanCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: List failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
