export interface Worktree {
  id: string;
  path: string;
  branch: string;
  isMainWorktree: boolean;
  issueNumber: number | null;
  createdAt: Date;
}

export interface CreateWorktreeInput {
  path: string;
  branch: string;
  issueNumber?: number;
}

export interface WorktreeListItem {
  path: string;
  branch: string;
  commit: string;
  isMainWorktree: boolean;
}
