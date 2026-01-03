import { execa } from 'execa';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import type {
  CreateWorktreeInput,
  Worktree,
  WorktreeListItem,
} from '@claudetree/shared';
import type { IWorktreeRepository } from '../../domain/repositories/IWorktreeRepository.js';

export class GitWorktreeAdapter implements IWorktreeRepository {
  private readonly normalizedRepoPath: string;

  constructor(private readonly repoPath: string) {
    this.normalizedRepoPath = realpathSync(repoPath);
  }

  async list(): Promise<WorktreeListItem[]> {
    const { stdout } = await execa('git', ['worktree', 'list', '--porcelain'], {
      cwd: this.repoPath,
    });
    return this.parseWorktreeOutput(stdout);
  }

  async create(input: CreateWorktreeInput): Promise<Worktree> {
    await execa('git', ['worktree', 'add', '-b', input.branch, input.path], {
      cwd: this.repoPath,
    });

    return {
      id: randomUUID(),
      path: input.path,
      branch: input.branch,
      isMainWorktree: false,
      issueNumber: input.issueNumber ?? null,
      createdAt: new Date(),
    };
  }

  async remove(path: string, force = false): Promise<void> {
    const args = ['worktree', 'remove', path];
    if (force) {
      args.push('--force');
    }
    await execa('git', args, { cwd: this.repoPath });
  }

  async prune(): Promise<void> {
    await execa('git', ['worktree', 'prune'], { cwd: this.repoPath });
  }

  private parseWorktreeOutput(output: string): WorktreeListItem[] {
    const worktrees: WorktreeListItem[] = [];
    const blocks = output.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      const worktree = this.parseWorktreeBlock(lines);
      if (worktree) {
        worktrees.push(worktree);
      }
    }

    return worktrees;
  }

  private parseWorktreeBlock(lines: string[]): WorktreeListItem | null {
    let path = '';
    let commit = '';
    let branch = '';

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice('worktree '.length);
      } else if (line.startsWith('HEAD ')) {
        commit = line.slice('HEAD '.length);
      } else if (line.startsWith('branch ')) {
        branch = line.slice('branch refs/heads/'.length);
      }
    }

    if (!path) return null;

    const normalizedPath = realpathSync(path);
    const isMainWorktree = normalizedPath === this.normalizedRepoPath;

    return { path: normalizedPath, commit, branch, isMainWorktree };
  }
}
