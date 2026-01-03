import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { GitWorktreeAdapter } from './GitWorktreeAdapter.js';

describe('GitWorktreeAdapter', () => {
  let testRepoPath: string;
  let adapter: GitWorktreeAdapter;

  beforeEach(async () => {
    // Create temp directory for test repo (resolve symlinks for macOS)
    const tempPath = await mkdtemp(join(tmpdir(), 'claudetree-test-'));
    testRepoPath = await realpath(tempPath);

    // Initialize git repo with initial commit
    await execa('git', ['init'], { cwd: testRepoPath });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: testRepoPath });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: testRepoPath });
    await execa('git', ['commit', '--allow-empty', '-m', 'Initial commit'], { cwd: testRepoPath });

    adapter = new GitWorktreeAdapter(testRepoPath);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await rm(testRepoPath, { recursive: true, force: true });
  });

  describe('list', () => {
    it('should return main worktree when no other worktrees exist', async () => {
      const result = await adapter.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: testRepoPath,
        isMainWorktree: true,
      });
      expect(result[0]?.branch).toBeDefined();
      expect(result[0]?.commit).toBeDefined();
    });

    it('should return all worktrees', async () => {
      const worktreePath = `${testRepoPath}-worktree-list`;
      await execa('git', ['worktree', 'add', '-b', 'feature-1', worktreePath], {
        cwd: testRepoPath,
      });

      const result = await adapter.list();

      expect(result).toHaveLength(2);
      expect(result.some((w) => w.isMainWorktree)).toBe(true);
      expect(result.some((w) => w.branch === 'feature-1')).toBe(true);

      // Cleanup
      await execa('git', ['worktree', 'remove', worktreePath], { cwd: testRepoPath });
    });
  });

  describe('create', () => {
    it('should create a new worktree with new branch', async () => {
      const worktreePath = `${testRepoPath}-create-new`;

      const result = await adapter.create({
        path: worktreePath,
        branch: 'feature-new',
      });

      expect(result.path).toBe(worktreePath);
      expect(result.branch).toBe('feature-new');
      expect(result.isMainWorktree).toBe(false);
      expect(result.id).toBeDefined();

      // Verify worktree exists
      const list = await adapter.list();
      expect(list.some((w) => w.branch === 'feature-new')).toBe(true);

      // Cleanup
      await adapter.remove(worktreePath);
    });

    it('should store issue number if provided', async () => {
      const worktreePath = `${testRepoPath}-issue`;

      const result = await adapter.create({
        path: worktreePath,
        branch: 'issue-42',
        issueNumber: 42,
      });

      expect(result.issueNumber).toBe(42);

      // Cleanup
      await adapter.remove(worktreePath);
    });
  });

  describe('remove', () => {
    it('should remove an existing worktree', async () => {
      const worktreePath = `${testRepoPath}-to-remove`;
      await adapter.create({ path: worktreePath, branch: 'to-remove' });

      await adapter.remove(worktreePath);

      const list = await adapter.list();
      expect(list.some((w) => w.branch === 'to-remove')).toBe(false);
    });

    it('should force remove worktree with uncommitted changes', async () => {
      const worktreePath = `${testRepoPath}-force-remove`;
      await adapter.create({ path: worktreePath, branch: 'force-remove' });

      // Create uncommitted change
      await execa('touch', ['newfile.txt'], { cwd: worktreePath });
      await execa('git', ['add', 'newfile.txt'], { cwd: worktreePath });

      await adapter.remove(worktreePath, true);

      const list = await adapter.list();
      expect(list.some((w) => w.branch === 'force-remove')).toBe(false);
    });
  });

  describe('prune', () => {
    it('should prune stale worktree entries', async () => {
      // This test verifies prune doesn't throw on valid repo
      await expect(adapter.prune()).resolves.not.toThrow();
    });
  });
});
