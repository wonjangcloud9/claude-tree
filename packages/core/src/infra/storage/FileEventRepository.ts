import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionEvent, SerializedSessionEvent } from '@claudetree/shared';
import type { IEventRepository } from '../../domain/repositories/IEventRepository.js';

const EVENTS_DIR = 'events';
const MAX_EVENTS = 1000;

export class FileEventRepository implements IEventRepository {
  private readonly eventsDir: string;

  constructor(configDir: string) {
    this.eventsDir = join(configDir, EVENTS_DIR);
  }

  async findBySessionId(sessionId: string): Promise<SessionEvent[]> {
    return this.loadEvents(sessionId);
  }

  async append(event: SessionEvent): Promise<void> {
    const events = await this.loadEvents(event.sessionId);
    events.push(event);

    // Rotate if over max
    const trimmed = events.slice(-MAX_EVENTS);
    await this.saveEvents(event.sessionId, trimmed);
  }

  async getLatest(sessionId: string, limit: number): Promise<SessionEvent[]> {
    const events = await this.loadEvents(sessionId);
    return events.slice(-limit);
  }

  async clear(sessionId: string): Promise<void> {
    await this.saveEvents(sessionId, []);
  }

  private getFilePath(sessionId: string): string {
    return join(this.eventsDir, `${sessionId}.json`);
  }

  private async loadEvents(sessionId: string): Promise<SessionEvent[]> {
    try {
      const content = await readFile(this.getFilePath(sessionId), 'utf-8');
      const data = JSON.parse(content) as SerializedSessionEvent[];
      return data.map(this.deserialize);
    } catch {
      return [];
    }
  }

  private async saveEvents(
    sessionId: string,
    events: SessionEvent[]
  ): Promise<void> {
    await mkdir(this.eventsDir, { recursive: true });
    const data = events.map(this.serialize);
    await writeFile(this.getFilePath(sessionId), JSON.stringify(data, null, 2));
  }

  private serialize(event: SessionEvent): SerializedSessionEvent {
    return {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };
  }

  private deserialize(data: SerializedSessionEvent): SessionEvent {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  }
}
