export type EventType =
  | 'output'
  | 'file_change'
  | 'commit'
  | 'test_run'
  | 'tool_call'
  | 'error'
  | 'milestone';

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: EventType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface SerializedSessionEvent
  extends Omit<SessionEvent, 'timestamp'> {
  timestamp: string;
}
