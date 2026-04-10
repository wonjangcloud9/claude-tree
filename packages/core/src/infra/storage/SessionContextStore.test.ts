import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionContextStore, type SessionContext } from './SessionContextStore.js';

function createContext(overrides?: Partial<SessionContext>): SessionContext {
  return {
    sessionId: 'test-session',
    issueNumber: 42,
    branch: 'issue-42-fix',
    completedAt: new Date().toISOString(),
    commits: ['feat: add feature', 'test: add tests'],
    filesChanged: ['src/index.ts', 'src/test.ts'],
    decisions: ['Used factory pattern for flexibility'],
    summary: 'Implemented feature with tests',
    ...overrides,
  };
}

describe('SessionContextStore', () => {
  let testDir: string;
  let store: SessionContextStore;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-context-'));
    store = new SessionContextStore(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('save and findByIssue', () => {
    it('saves and retrieves context by issue number', async () => {
      const ctx = createContext();
      await store.save(ctx);

      const found = await store.findByIssue(42);
      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe('test-session');
      expect(found!.commits).toHaveLength(2);
    });

    it('returns null for unknown issue', async () => {
      const found = await store.findByIssue(999);
      expect(found).toBeNull();
    });
  });

  describe('save and findByBranch', () => {
    it('saves and retrieves context by branch', async () => {
      const ctx = createContext({ issueNumber: null, branch: 'feature/auth' });
      await store.save(ctx);

      const found = await store.findByBranch('feature/auth');
      expect(found).not.toBeNull();
      expect(found!.branch).toBe('feature/auth');
    });

    it('returns null for unknown branch', async () => {
      const found = await store.findByBranch('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all saved contexts', async () => {
      await store.save(createContext({ sessionId: 's1', issueNumber: 1 }));
      await store.save(createContext({ sessionId: 's2', issueNumber: 2 }));

      const all = await store.findAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no contexts', async () => {
      const all = await store.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('overwrite', () => {
    it('overwrites existing context for same issue', async () => {
      await store.save(createContext({ summary: 'v1' }));
      await store.save(createContext({ summary: 'v2' }));

      const found = await store.findByIssue(42);
      expect(found!.summary).toBe('v2');
    });
  });
});
