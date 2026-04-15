import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockRemove = vi.fn().mockResolvedValue(undefined);
const mockPrune = vi.fn().mockResolvedValue(undefined);

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
    delete = mockDelete;
  },
  GitWorktreeAdapter: class {
    remove = mockRemove;
    prune = mockPrune;
  },
}));

import { cleanupCommand } from './cleanup.js';

const createSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-id-123',
  worktreeId: 'wt-id',
  claudeSessionId: null,
  status: 'completed',
  issueNumber: 1,
  prompt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: null,
  usage: { inputTokens: 100, outputTokens: 50, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, totalCostUsd: 0.01 },
  progress: null,
  retryCount: 0,
  lastError: null,
  tags: [],
  ...overrides,
});

describe('cleanupCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-cleanup-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockRemove.mockReset().mockResolvedValue(undefined);
    mockPrune.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should show nothing to clean when no matching sessions', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ status: 'running' }),
    ]);

    await cleanupCommand.parseAsync(['node', 'test', '--dry-run']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No sessions to clean up.');
  });

  it('should preview completed and failed sessions in dry-run', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', status: 'completed', issueNumber: 1 }),
      createSession({ id: 's2', status: 'failed', issueNumber: 2, lastError: 'test error' }),
      createSession({ id: 's3', status: 'running', issueNumber: 3 }),
    ]);

    await cleanupCommand.parseAsync(['node', 'test', '--dry-run']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Cleanup Preview');
    expect(output).toContain('Completed');
    expect(output).toContain('Failed');
    expect(output).toContain('Dry run');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should filter by status', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', status: 'completed' }),
      createSession({ id: 's2', status: 'failed' }),
    ]);

    await cleanupCommand.parseAsync(['node', 'test', '--status', 'failed', '--dry-run']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('1 session(s)');
  });

  it('should filter by batch', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', status: 'completed', tags: ['bustercall:batch-abc'] }),
      createSession({ id: 's2', status: 'completed', tags: [] }),
    ]);

    await cleanupCommand.parseAsync(['node', 'test', '--batch', 'batch-abc', '--dry-run']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('1 session(s)');
  });

  it('should actually delete sessions when not dry-run', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', status: 'completed', worktreePath: null }),
    ]);

    await cleanupCommand.parseAsync(['node', 'test']);

    expect(mockDelete).toHaveBeenCalledWith('s1');
  });
});
