export type SessionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

export interface Session {
  id: string;
  worktreeId: string;
  claudeSessionId: string | null;
  status: SessionStatus;
  issueNumber: number | null;
  prompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  worktreeId: string;
  issueNumber?: number;
  prompt?: string;
}
