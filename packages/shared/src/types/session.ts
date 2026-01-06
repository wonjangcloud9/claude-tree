export type SessionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  totalCostUsd: number;
}

export type ProgressStep =
  | 'analyzing'    // Reading issue/code
  | 'implementing' // Writing code
  | 'testing'      // Running tests
  | 'committing'   // Creating commit
  | 'creating_pr'; // Creating PR

export interface SessionProgress {
  currentStep: ProgressStep;
  completedSteps: ProgressStep[];
  startedAt: Date;
}

export interface Session {
  id: string;
  worktreeId: string;
  claudeSessionId: string | null;
  status: SessionStatus;
  issueNumber: number | null;
  prompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Recovery fields
  processId: string | null;
  osProcessId: number | null;
  lastHeartbeat: Date | null;
  errorCount: number;
  worktreePath: string | null;
  // Token usage
  usage: TokenUsage | null;
  // Progress tracking
  progress: SessionProgress | null;
}

export interface CreateSessionInput {
  worktreeId: string;
  issueNumber?: number;
  prompt?: string;
}
