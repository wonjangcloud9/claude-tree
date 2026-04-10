import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockListIssues = vi.fn();
const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => ({
  GitHubAdapter: vi.fn().mockImplementation(() => ({
    listIssues: mockListIssues,
  })),
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
  })),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    unref: vi.fn(),
    pid: 12345,
  }),
}));

import { watchCommand } from './watch.js';

describe('watchCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-watch-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockListIssues.mockReset();
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

  describe('when not initialized', () => {
    it('should display error and exit', async () => {
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        watchCommand.parseAsync(['node', 'test'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: claudetree not initialized. Run "claudetree init" first.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
    });

    it('should error if no github config', async () => {
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        JSON.stringify({ worktreeDir: '.worktrees' }),
      );

      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        watchCommand.parseAsync(['node', 'test'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: GitHub owner/repo not configured. Run "claudetree init".'
      );
    });

    it('should error if no token', async () => {
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        JSON.stringify({
          worktreeDir: '.worktrees',
          github: { owner: 'test', repo: 'repo' },
        }),
      );
      delete process.env.GITHUB_TOKEN;

      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        watchCommand.parseAsync(['node', 'test'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: GitHub token required. Use --token or set GITHUB_TOKEN.'
      );
    });

    it('should have correct command name and description', () => {
      expect(watchCommand.name()).toBe('watch');
      expect(watchCommand.description()).toContain('Watch GitHub');
    });

    it('should accept --label option', () => {
      const opts = watchCommand.opts();
      const labelOption = watchCommand.options.find(o => o.long === '--label');
      expect(labelOption).toBeDefined();
    });

    it('should accept --interval option with default', () => {
      const intervalOption = watchCommand.options.find(o => o.long === '--interval');
      expect(intervalOption).toBeDefined();
      expect(intervalOption?.defaultValue).toBe('60');
    });

    it('should accept --dry-run option', () => {
      const dryRunOption = watchCommand.options.find(o => o.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });
  });
});
