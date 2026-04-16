import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => {
  return {
    FileSessionRepository: class {
      findAll = mockFindAll;
      save = vi.fn();
    },
  };
});

import { prCommand } from './pr.js';

describe('prCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-pr-test-'));
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

  describe('when not initialized', () => {
    it('should error and exit', async () => {
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        prCommand.parseAsync(['node', 'test'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not initialized')
      );
    });
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        JSON.stringify({
          worktreeDir: '.worktrees',
          github: { owner: 'test', repo: 'repo', token: 'ghp_test' },
        }),
      );
    });

    it('should show message when no completed sessions', async () => {
      mockFindAll.mockResolvedValue([]);

      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        prCommand.parseAsync(['node', 'test', '--all'])
      ).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sessions to create PRs for')
      );
    });

    it('should error when specific session not found', async () => {
      mockFindAll.mockResolvedValue([]);

      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(
        prCommand.parseAsync(['node', 'test', '--session', 'nonexist'])
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });

    it('should have correct command name', () => {
      expect(prCommand.name()).toBe('pr');
    });

    it('should accept --base option with default', () => {
      const baseOpt = prCommand.options.find(o => o.long === '--base');
      expect(baseOpt).toBeDefined();
      expect(baseOpt?.defaultValue).toBe('develop');
    });

    it('should accept --dry-run and --all options', () => {
      expect(prCommand.options.find(o => o.long === '--dry-run')).toBeDefined();
      expect(prCommand.options.find(o => o.long === '--all')).toBeDefined();
    });
  });
});
