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

import { reportCommand } from './report.js';

const createSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-id-123456',
  worktreeId: 'wt-id',
  claudeSessionId: null,
  status: 'completed',
  issueNumber: 42,
  prompt: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: null,
  usage: { inputTokens: 1000, outputTokens: 500, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, totalCostUsd: 0.05 },
  progress: null,
  retryCount: 0,
  lastError: null,
  tags: [],
  ...overrides,
});

describe('reportCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-report-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockFindAll.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate markdown report', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', status: 'completed', issueNumber: 1 }),
      createSession({ id: 's2', status: 'failed', issueNumber: 2, lastError: 'Test failed' }),
    ]);

    await reportCommand.parseAsync(['node', 'test']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('# claudetree Report');
    expect(output).toContain('## Summary');
    expect(output).toContain('Total Sessions | 2');
    expect(output).toContain('50%'); // success rate
    expect(output).toContain('## Session Details');
    expect(output).toContain('## Failed Sessions');
    expect(output).toContain('Test failed');
  });

  it('should show batch breakdown', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ tags: ['bustercall:batch-abc'] }),
      createSession({ id: 's2', tags: ['bustercall:batch-abc'] }),
    ]);

    await reportCommand.parseAsync(['node', 'test']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('## Batch Summary');
    expect(output).toContain('batch-abc');
  });

  it('should filter by batch', async () => {
    mockFindAll.mockResolvedValue([
      createSession({ id: 's1', tags: ['bustercall:batch-abc'] }),
      createSession({ id: 's2', tags: [] }),
    ]);

    await reportCommand.parseAsync(['node', 'test', '--batch', 'batch-abc']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Total Sessions | 1');
  });

  it('should handle no sessions', async () => {
    mockFindAll.mockResolvedValue([]);

    await reportCommand.parseAsync(['node', 'test']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No sessions found for the specified criteria.',
    );
  });

  it('should save to file with --output', async () => {
    mockFindAll.mockResolvedValue([createSession()]);
    const outputPath = join(testDir, 'report.md');

    await reportCommand.parseAsync(['node', 'test', '--output', outputPath]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Report saved to'),
    );
  });
});
