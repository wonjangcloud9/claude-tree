import type { SessionEvent } from '@claudetree/shared';

export interface IEventRepository {
  findBySessionId(sessionId: string): Promise<SessionEvent[]>;
  append(event: SessionEvent): Promise<void>;
  getLatest(sessionId: string, limit: number): Promise<SessionEvent[]>;
  clear(sessionId: string): Promise<void>;
}
