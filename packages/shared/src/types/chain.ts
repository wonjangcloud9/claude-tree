export type ChainItemStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ChainItem {
  issue: string;
  order: number;
  status: ChainItemStatus;
  sessionId?: string;
  branchName?: string;
  baseBranch?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface Chain {
  id: string;
  items: ChainItem[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  options: ChainOptions;
}

export interface ChainOptions {
  template?: string;
  skipFailed: boolean;
  autoMerge: boolean;
  baseBranch: string;
}

export interface ChainSummary {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  pending: number;
}
