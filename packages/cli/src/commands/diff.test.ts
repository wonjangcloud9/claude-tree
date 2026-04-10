import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockFindAll = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
  },
}));

vi.mock('node:child_process', async (importOriginal) => {
  const orig = await importOriginal<typeof import('node:child_process')>();
  return {
    ...orig,
    exec: vi.fn((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, '', '');
    }),
  };
});

import { diffCommand } from './diff.js';

describe('diffCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-diff-'));
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
    await expect(diffCommand.parseAsync(['node', 'test'])).rejects.toThrow('exit');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('not initialized'),
    );
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
    });

    it('should show no sessions message', async () => {
      mockFindAll.mockResolvedValue([]);
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('exit');
      });
      await expect(
        diffCommand.parseAsync(['node', 'test']),
      ).rejects.toThrow('exit');
      expect(consoleLogSpy).toHaveBeenCalledWith('No sessions found.');
    });

    it('should have correct command name and options', () => {
      expect(diffCommand.name()).toBe('diff');
      expect(diffCommand.options.find(o => o.long === '--base')).toBeDefined();
      expect(diffCommand.options.find(o => o.long === '--stat')).toBeDefined();
      expect(diffCommand.options.find(o => o.long === '--all')).toBeDefined();
      expect(diffCommand.options.find(o => o.long === '--tag')).toBeDefined();
    });

    it('should error for unknown session', async () => {
      mockFindAll.mockResolvedValue([]);
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('exit');
      });
      await expect(
        diffCommand.parseAsync(['node', 'test', '--session', 'xyz']),
      ).rejects.toThrow('exit');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });
  });
});
