import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository.js';

const SESSIONS_FILE = 'sessions.json';

export class FileSessionRepository implements ISessionRepository {
  private readonly filePath: string;

  constructor(private readonly configDir: string) {
    this.filePath = join(configDir, SESSIONS_FILE);
  }

  async findById(id: string): Promise<Session | null> {
    const sessions = await this.loadSessions();
    return sessions.find((s) => s.id === id) ?? null;
  }

  async findByWorktreeId(worktreeId: string): Promise<Session | null> {
    const sessions = await this.loadSessions();
    return sessions.find((s) => s.worktreeId === worktreeId) ?? null;
  }

  async findAll(): Promise<Session[]> {
    return this.loadSessions();
  }

  async save(session: Session): Promise<void> {
    const sessions = await this.loadSessions();
    const index = sessions.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    await this.saveSessions(sessions);
  }

  async delete(id: string): Promise<void> {
    const sessions = await this.loadSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.saveSessions(filtered);
  }

  private async loadSessions(): Promise<Session[]> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content) as SerializedSession[];
      return data.map(this.deserializeSession);
    } catch {
      return [];
    }
  }

  private async saveSessions(sessions: Session[]): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    const data = sessions.map(this.serializeSession);
    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  private serializeSession(session: Session): SerializedSession {
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private deserializeSession(data: SerializedSession): Session {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}

interface SerializedSession extends Omit<Session, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}
