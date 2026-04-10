import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
  },
  FileEventRepository: class {
    findBySessionId = vi.fn().mockResolvedValue([]);
  },
  SessionContextStore: class {
    findAll = vi.fn().mockResolvedValue([]);
  },
}));

import { summaryCommand } from './summary.js';

describe('summaryCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-summary-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should error when not initialized', async () => {
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('exit');
    });
    await expect(summaryCommand.parseAsync(['node', 'test'])).rejects.toThrow('exit');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('not initialized'),
    );
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
    });

    it('should show no sessions message when empty', async () => {
      mockFindAll.mockResolvedValue([]);
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('exit');
      });
      await expect(
        summaryCommand.parseAsync(['node', 'test']),
      ).rejects.toThrow('exit');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sessions found'),
      );
    });

    it('should display summary for sessions', async () => {
      mockFindAll.mockResolvedValue([
        {
          id: 'abc',
          status: 'completed',
          issueNumber: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: { inputTokens: 1000, outputTokens: 500, totalCostUsd: 0.05 },
          tags: ['sprint-1'],
        },
      ]);

      await summaryCommand.parseAsync(['node', 'test']);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Summary');
      expect(output).toContain('#42');
      expect(output).toContain('0.05');
    });

    it('should output JSON format', async () => {
      mockFindAll.mockResolvedValue([
        {
          id: 'abc',
          status: 'completed',
          issueNumber: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: { inputTokens: 100, outputTokens: 50, totalCostUsd: 0.01 },
          tags: [],
        },
      ]);

      await summaryCommand.parseAsync(['node', 'test', '--format', 'json']);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.total).toBe(1);
      expect(parsed.completed).toBe(1);
    });

    it('should have correct command name', () => {
      expect(summaryCommand.name()).toBe('summary');
    });

    it('should accept format and since options', () => {
      expect(summaryCommand.options.find(o => o.long === '--format')).toBeDefined();
      expect(summaryCommand.options.find(o => o.long === '--since')).toBeDefined();
    });
  });
});
