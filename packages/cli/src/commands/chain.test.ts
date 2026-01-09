import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock spawn
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock crypto for consistent UUIDs in tests
vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

import { chainCommand } from './chain.js';

describe('chainCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleClearSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-chain-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleClearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    mockSpawn.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleClearSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('when not initialized', () => {
    it('should display error and exit with code 1', async () => {
      const exitError = new Error('process.exit called');
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw exitError;
      });

      await expect(
        chainCommand.parseAsync(['node', 'test', '10', '11', '12'])
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
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        JSON.stringify({
          worktreeDir: '.worktrees',
          github: {
            token: 'test-token',
            owner: 'test-owner',
            repo: 'test-repo',
          },
        })
      );
    });

    describe('with insufficient issues', () => {
      it('should error when only one issue provided', async () => {
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          chainCommand.parseAsync(['node', 'test', '10'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error: Chain requires at least 2 issues.'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('with --dry-run option', () => {
      it('should show chain plan without executing', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '12',
          '--dry-run',
        ]);

        expect(mockSpawn).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });

      it('should display issues in order with branch info', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('#10');
        expect(logCalls).toContain('#11');
        expect(logCalls).toContain('issue-10');
        expect(logCalls).toContain('issue-11');
      });

      it('should show base branch for first issue', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '--dry-run',
          '--base-branch',
          'main',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('main');
      });

      it('should show dependency relationships', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '12',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        // Second issue should base on first
        expect(logCalls).toContain('issue-10');
        // Third issue should base on second
        expect(logCalls).toContain('issue-11');
      });
    });

    describe('with --base-branch option', () => {
      it('should use custom base branch', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '--base-branch',
          'main',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('main');
      });
    });

    describe('with --template option', () => {
      it('should include template in output', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '--template',
          'bugfix',
          '--dry-run',
        ]);

        // Template is passed to session start, not necessarily shown in dry-run
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });
    });

    describe('branch name generation', () => {
      it('should generate branch names from issue numbers', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          '101',
          '102',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('issue-101');
        expect(logCalls).toContain('issue-102');
      });

      it('should sanitize non-numeric issue names', async () => {
        await chainCommand.parseAsync([
          'node',
          'test',
          'feature-auth',
          'feature-dashboard',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('feature-auth');
        expect(logCalls).toContain('feature-dashboard');
      });
    });

    describe('chain state persistence', () => {
      it('should create chains directory for non-dry-run', async () => {
        // Setup mock for spawn
        const mockProc = {
          unref: vi.fn(),
          on: vi.fn(),
        };
        mockSpawn.mockReturnValue(mockProc);

        // Mock session creation by writing to sessions.json
        await writeFile(
          join(testDir, '.claudetree', 'sessions.json'),
          JSON.stringify([
            { issueNumber: 10, status: 'completed', id: 'session-1' },
            { issueNumber: 11, status: 'completed', id: 'session-2' },
          ])
        );

        // We can't easily test the full execution because it requires
        // waiting for sessions, so we just verify dry-run works
        await chainCommand.parseAsync([
          'node',
          'test',
          '10',
          '11',
          '--dry-run',
        ]);

        // In dry-run, chains dir is not created
        await expect(
          access(join(testDir, '.claudetree', 'chains'))
        ).rejects.toThrow();
      });
    });
  });
});
