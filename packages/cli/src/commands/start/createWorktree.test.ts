import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrFindWorktree } from './createWorktree.js';

// Mock GitWorktreeAdapter
vi.mock('@claudetree/core', async () => {
  const actual = await vi.importActual('@claudetree/core');
  return {
    ...actual,
    GitWorktreeAdapter: vi.fn().mockImplementation(() => ({
      list: vi.fn().mockResolvedValue([
        { path: '/worktrees/existing-branch', branch: 'existing-branch' },
      ]),
      create: vi.fn().mockImplementation(async (opts: { path: string; branch: string; issueNumber?: number }) => ({
        id: 'mock-uuid-123',
        path: opts.path,
        branch: opts.branch,
      })),
    })),
  };
});

describe('createOrFindWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('existing worktree', () => {
    it('should return existing worktree when branch already exists', async () => {
      const result = await createOrFindWorktree({
        cwd: '/project',
        worktreeDir: '.worktrees',
        branchName: 'existing-branch',
      });

      expect(result.isExisting).toBe(true);
      expect(result.worktree.branch).toBe('existing-branch');
      expect(result.worktree.path).toBe('/worktrees/existing-branch');
    });

    it('should match by path ending with branch name', async () => {
      const result = await createOrFindWorktree({
        cwd: '/project',
        worktreeDir: '.worktrees',
        branchName: 'existing-branch',
      });

      expect(result.isExisting).toBe(true);
    });
  });

  describe('new worktree', () => {
    it('should create new worktree when branch does not exist', async () => {
      const result = await createOrFindWorktree({
        cwd: '/project',
        worktreeDir: '.worktrees',
        branchName: 'new-branch',
      });

      expect(result.isExisting).toBe(false);
      expect(result.worktree.branch).toBe('new-branch');
      expect(result.worktree.path).toBe('/project/.worktrees/new-branch');
    });

    it('should pass issueNumber to create', async () => {
      const result = await createOrFindWorktree({
        cwd: '/project',
        worktreeDir: '.worktrees',
        branchName: 'issue-42-feature',
        issueNumber: 42,
      });

      expect(result.isExisting).toBe(false);
      expect(result.worktree.branch).toBe('issue-42-feature');
    });
  });

  describe('error handling', () => {
    it('should throw error when create fails', async () => {
      const { GitWorktreeAdapter } = await import('@claudetree/core');
      vi.mocked(GitWorktreeAdapter).mockImplementationOnce(() => ({
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockRejectedValue(new Error('Git error: branch already exists')),
      }));

      await expect(
        createOrFindWorktree({
          cwd: '/project',
          worktreeDir: '.worktrees',
          branchName: 'conflict-branch',
        })
      ).rejects.toThrow('Git error');
    });
  });
});
