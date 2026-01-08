import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listCommand } from './list.js';

// Mock GitWorktreeAdapter
vi.mock('@claudetree/core', () => ({
  GitWorktreeAdapter: vi.fn().mockImplementation(() => ({
    list: vi.fn(),
  })),
}));

import { GitWorktreeAdapter } from '@claudetree/core';

describe('listCommand', () => {
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockList = vi.fn();
    vi.mocked(GitWorktreeAdapter).mockImplementation(
      () =>
        ({
          list: mockList,
        }) as unknown as InstanceType<typeof GitWorktreeAdapter>
    );
  });

  afterEach(() => {
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('when no worktrees exist', () => {
    it('should display "No worktrees found" message', async () => {
      mockList.mockResolvedValue([]);

      await listCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith('No worktrees found.');
    });
  });

  describe('when worktrees exist', () => {
    const mockWorktrees = [
      {
        path: '/path/to/main',
        branch: 'main',
        commit: 'abc123def456',
        isMainWorktree: true,
      },
      {
        path: '/path/to/feature',
        branch: 'feature-branch',
        commit: 'def456abc789',
        isMainWorktree: false,
      },
    ];

    it('should display worktrees with their details', async () => {
      mockList.mockResolvedValue(mockWorktrees);

      await listCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith('Worktrees:\n');
      expect(consoleLogSpy).toHaveBeenCalledWith('  main (main)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  feature-branch');
      expect(consoleLogSpy).toHaveBeenCalledWith('    Path: /path/to/main');
      expect(consoleLogSpy).toHaveBeenCalledWith('    Path: /path/to/feature');
      expect(consoleLogSpy).toHaveBeenCalledWith('    Commit: abc123de');
      expect(consoleLogSpy).toHaveBeenCalledWith('    Commit: def456ab');
    });

    it('should handle detached HEAD state', async () => {
      mockList.mockResolvedValue([
        {
          path: '/path/to/detached',
          branch: null,
          commit: '123456789',
          isMainWorktree: false,
        },
      ]);

      await listCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  (detached)');
    });
  });

  describe('with --json option', () => {
    it('should output worktrees as JSON', async () => {
      const mockWorktrees = [
        {
          path: '/path/to/main',
          branch: 'main',
          commit: 'abc123def456',
          isMainWorktree: true,
        },
      ];
      mockList.mockResolvedValue(mockWorktrees);

      await listCommand.parseAsync(['node', 'test', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(mockWorktrees, null, 2)
      );
    });
  });

  describe('when git command fails', () => {
    it('should display error and exit with code 1', async () => {
      mockList.mockRejectedValue(new Error('Git not available'));

      await listCommand.parseAsync(['node', 'test']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Git not available');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('alias', () => {
    it('should have "ls" as an alias', () => {
      expect(listCommand.alias()).toBe('ls');
    });
  });
});
