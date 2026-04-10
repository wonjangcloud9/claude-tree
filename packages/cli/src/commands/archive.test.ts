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

import { archiveCommand } from './archive.js';

describe('archiveCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-archive-'));
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
    await expect(archiveCommand.parseAsync(['node', 'test'])).rejects.toThrow('exit');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('not initialized'),
    );
  });

  describe('when initialized', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
    });

    it('should show no sessions when nothing to archive', async () => {
      mockFindAll.mockResolvedValue([]);
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('exit');
      });
      await expect(
        archiveCommand.parseAsync(['node', 'test']),
      ).rejects.toThrow('exit');
      expect(consoleLogSpy).toHaveBeenCalledWith('No sessions to archive.');
    });

    it('should show dry-run preview', async () => {
      mockFindAll.mockResolvedValue([
        {
          id: 'abc12345',
          status: 'completed',
          issueNumber: 42,
          updatedAt: new Date('2025-01-01'),
          tags: [],
        },
      ]);

      await archiveCommand.parseAsync(['node', 'test', '--dry-run']);

      const output = consoleLogSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
      expect(output).toContain('Would archive');
      expect(output).toContain('#42');
    });

    it('should have correct command name and options', () => {
      expect(archiveCommand.name()).toBe('archive');
      expect(archiveCommand.options.find(o => o.long === '--status')).toBeDefined();
      expect(archiveCommand.options.find(o => o.long === '--before')).toBeDefined();
      expect(archiveCommand.options.find(o => o.long === '--dry-run')).toBeDefined();
    });
  });
});
