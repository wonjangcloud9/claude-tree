import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GitWorktreeAdapter } from '@claudetree/core';

export interface WorktreeInfo {
  id: string;
  path: string;
  branch: string;
}

export interface CreateWorktreeOptions {
  cwd: string;
  worktreeDir: string;
  branchName: string;
  issueNumber?: number;
}

export interface CreateWorktreeResult {
  worktree: WorktreeInfo;
  isExisting: boolean;
}

/**
 * Create a new worktree or find existing one
 */
export async function createOrFindWorktree(
  options: CreateWorktreeOptions
): Promise<CreateWorktreeResult> {
  const { cwd, worktreeDir, branchName, issueNumber } = options;

  const worktreePath = join(cwd, worktreeDir, branchName);
  const gitAdapter = new GitWorktreeAdapter(cwd);

  // Check for existing worktree
  const existingWorktrees = await gitAdapter.list();
  const existingWorktree = existingWorktrees.find(
    (wt) => wt.branch === branchName || wt.path.endsWith(branchName)
  );

  if (existingWorktree) {
    return {
      worktree: {
        id: randomUUID(),
        path: existingWorktree.path,
        branch: existingWorktree.branch,
      },
      isExisting: true,
    };
  }

  // Create new worktree
  const worktree = await gitAdapter.create({
    path: worktreePath,
    branch: branchName,
    issueNumber,
  });

  return {
    worktree,
    isExisting: false,
  };
}
