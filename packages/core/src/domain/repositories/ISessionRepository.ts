import type { Session, TokenUsage } from '@claudetree/shared';

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByWorktreeId(worktreeId: string): Promise<Session | null>;
  findAll(): Promise<Session[]>;
  save(session: Session): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IClaudeSessionAdapter {
  start(config: ClaudeSessionConfig): Promise<ClaudeSessionResult>;
  resume(sessionId: string, prompt: string): Promise<ClaudeSessionResult>;
  stop(processId: string): Promise<void>;
  getOutput(processId: string): AsyncIterable<ClaudeOutput>;
  isProcessAlive(osProcessId: number): boolean;
}

export interface ClaudeSessionConfig {
  workingDir: string;
  prompt: string;
  allowedTools?: string[];
  systemPrompt?: string;
  resume?: string;
}

export interface ClaudeSessionResult {
  processId: string;
  claudeSessionId: string | null;
  osProcessId: number | null;
}

export interface ClaudeOutput {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'done';
  content: string;
  timestamp: Date;
  usage?: TokenUsage;
}
