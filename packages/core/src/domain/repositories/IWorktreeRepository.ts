import type { CreateWorktreeInput, Worktree, WorktreeListItem } from '@claudetree/shared';

export interface IWorktreeRepository {
  list(): Promise<WorktreeListItem[]>;
  create(input: CreateWorktreeInput): Promise<Worktree>;
  remove(path: string, force?: boolean): Promise<void>;
  prune(): Promise<void>;
}
