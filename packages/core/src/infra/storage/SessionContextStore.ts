import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface SessionContext {
  sessionId: string;
  issueNumber: number | null;
  branch: string;
  completedAt: string;
  commits: string[];
  filesChanged: string[];
  decisions: string[];
  summary: string;
}

export class SessionContextStore {
  private readonly contextDir: string;

  constructor(configDir: string) {
    this.contextDir = join(configDir, 'context');
  }

  async save(context: SessionContext): Promise<void> {
    await mkdir(this.contextDir, { recursive: true });
    const filename = context.issueNumber
      ? `issue-${context.issueNumber}.json`
      : `branch-${context.branch.replace(/\//g, '-')}.json`;
    await writeFile(
      join(this.contextDir, filename),
      JSON.stringify(context, null, 2),
    );
  }

  async findByIssue(issueNumber: number): Promise<SessionContext | null> {
    try {
      const content = await readFile(
        join(this.contextDir, `issue-${issueNumber}.json`),
        'utf-8',
      );
      return JSON.parse(content) as SessionContext;
    } catch {
      return null;
    }
  }

  async findByBranch(branch: string): Promise<SessionContext | null> {
    try {
      const filename = `branch-${branch.replace(/\//g, '-')}.json`;
      const content = await readFile(
        join(this.contextDir, filename),
        'utf-8',
      );
      return JSON.parse(content) as SessionContext;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<SessionContext[]> {
    try {
      const files = await readdir(this.contextDir);
      const contexts: SessionContext[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await readFile(
            join(this.contextDir, file),
            'utf-8',
          );
          contexts.push(JSON.parse(content) as SessionContext);
        } catch {
          // Skip invalid files
        }
      }
      return contexts;
    } catch {
      return [];
    }
  }
}
