import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();
const mockGetLatest = vi.fn().mockResolvedValue([]);

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
  },
  FileEventRepository: class {
    getLatest = mockGetLatest;
  },
}));

import { inspectCommand } from './inspect.js';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id-123456',
  worktreeId: 'worktree-id-456789',
  claudeSessionId: 'claude-abc',
  status: 'completed',
  issueNumber: 42,
  prompt: 'Fix the login bug',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: '/tmp/test-worktree',
  usage: {
    inputTokens: 5000,
    outputTokens: 2000,
    cacheReadInputTokens: 1000,
    cacheCreationInputTokens: 500,
    totalCostUsd: 0.0523,
  },
  progress: null,
  retryCount: 0,
  lastError: null,
  tags: ['bugfix', 'bustercall:batch-abc'],
  ...overrides,
});

describe('inspectCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-inspect-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockGetLatest.mockReset().mockResolvedValue([]);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should display session details', async () => {
    mockFindAll.mockResolvedValue([createMockSession()]);

    await inspectCommand.parseAsync(['node', 'test', 'test-ses']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('test-ses');
    expect(output).toContain('#42');
    expect(output).toContain('completed');
    expect(output).toContain('0.0523');
  });

  it('should display token usage', async () => {
    mockFindAll.mockResolvedValue([createMockSession()]);

    await inspectCommand.parseAsync(['node', 'test', 'test-ses']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('5,000');
    expect(output).toContain('2,000');
  });

  it('should display tags and batch info', async () => {
    mockFindAll.mockResolvedValue([createMockSession()]);

    await inspectCommand.parseAsync(['node', 'test', 'test-ses']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('bugfix');
    expect(output).toContain('bustercall:batch-abc');
  });

  it('should find session by issue number', async () => {
    mockFindAll.mockResolvedValue([createMockSession()]);

    await inspectCommand.parseAsync(['node', 'test', '42']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('#42');
  });

  it('should error when session not found', async () => {
    mockFindAll.mockResolvedValue([]);
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      inspectCommand.parseAsync(['node', 'test', 'nonexistent']),
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No session found'),
    );
  });

  it('should output JSON with --json flag', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);

    await inspectCommand.parseAsync(['node', 'test', 'test-ses', '--json']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"id"'),
    );
  });

  it('should show rerun action for failed sessions', async () => {
    mockFindAll.mockResolvedValue([
      createMockSession({ status: 'failed', lastError: 'Test failure' }),
    ]);

    await inspectCommand.parseAsync(['node', 'test', 'test-ses']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('ct rerun');
    expect(output).toContain('Test failure');
  });
});
