import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
  },
}));

import { costCommand } from './cost.js';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id',
  worktreeId: 'wt-id',
  claudeSessionId: null,
  status: 'completed',
  issueNumber: 1,
  prompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: null,
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    totalCostUsd: 0.05,
  },
  progress: null,
  retryCount: 0,
  lastError: null,
  tags: [],
  ...overrides,
});

describe('costCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-cost-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should display cost summary', async () => {
    mockFindAll.mockResolvedValue([
      createMockSession({ usage: { inputTokens: 1000, outputTokens: 500, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, totalCostUsd: 0.05 } }),
      createMockSession({ id: 's2', usage: { inputTokens: 2000, outputTokens: 1000, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, totalCostUsd: 0.10 } }),
    ]);

    await costCommand.parseAsync(['node', 'test']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Cost Analytics');
    expect(output).toContain('0.1500');
    expect(output).toContain('Daily Breakdown');
  });

  it('should show batch costs', async () => {
    mockFindAll.mockResolvedValue([
      createMockSession({ tags: ['bustercall:batch-xyz'] }),
    ]);

    await costCommand.parseAsync(['node', 'test']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Batch Costs');
    expect(output).toContain('batch-xyz');
  });

  it('should filter by batch', async () => {
    mockFindAll.mockResolvedValue([
      createMockSession({ id: 's1', tags: ['bustercall:batch-abc'] }),
      createMockSession({ id: 's2', tags: ['bustercall:batch-xyz'] }),
    ]);

    await costCommand.parseAsync(['node', 'test', '--batch', 'batch-abc']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    // Should only show 1 session's cost ($0.05)
    expect(output).toContain('0.0500');
  });

  it('should output JSON with --json flag', async () => {
    mockFindAll.mockResolvedValue([createMockSession()]);

    await costCommand.parseAsync(['node', 'test', '--json']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"totalCost"'),
    );
  });

  it('should show budget warning', async () => {
    mockFindAll.mockResolvedValue([
      createMockSession({
        usage: { inputTokens: 10000, outputTokens: 5000, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, totalCostUsd: 5.00 },
      }),
    ]);

    await costCommand.parseAsync(['node', 'test', '--budget', '1.00']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Budget');
  });
});
