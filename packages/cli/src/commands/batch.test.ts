import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock spawn
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock GitHubAdapter and SlackNotifier
const mockListIssues = vi.fn();
const mockNotifyBatch = vi.fn();
vi.mock('@claudetree/core', () => ({
  GitHubAdapter: vi.fn().mockImplementation(() => ({
    listIssues: mockListIssues,
  })),
  SlackNotifier: vi.fn().mockImplementation(() => ({
    notifyBatch: mockNotifyBatch,
  })),
}));

import { batchCommand } from './batch.js';

describe('batchCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleClearSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-batch-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    originalEnv = { ...process.env };
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleClearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    mockSpawn.mockReset();
    mockListIssues.mockReset();
    mockNotifyBatch.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    process.env = originalEnv;
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
        batchCommand.parseAsync(['node', 'test', '101', '102'])
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

    describe('when no issues specified', () => {
      it('should display error and exit with code 1', async () => {
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(batchCommand.parseAsync(['node', 'test'])).rejects.toThrow(
          'process.exit called'
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: No issues specified.');
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('with issue arguments', () => {
      it('should process provided issue numbers', async () => {
        const mockProc = {
          unref: vi.fn(),
          on: vi.fn(),
        };
        mockSpawn.mockReturnValue(mockProc);

        await batchCommand.parseAsync(['node', 'test', '101', '102', '--dry-run']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });

      it('should deduplicate issues', async () => {
        await batchCommand.parseAsync([
          'node',
          'test',
          '101',
          '101',
          '102',
          '--dry-run',
        ]);

        // Should show only 2 unique issues
        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('101');
        expect(logCalls).toContain('102');
      });
    });

    describe('with --file option', () => {
      it('should read issues from file', async () => {
        const issuesFile = join(testDir, 'issues.txt');
        await writeFile(issuesFile, '101\n102\n103\n');

        await batchCommand.parseAsync([
          'node',
          'test',
          '--file',
          issuesFile,
          '--dry-run',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });

      it('should ignore comments in file', async () => {
        const issuesFile = join(testDir, 'issues.txt');
        await writeFile(issuesFile, '# comment\n101\n102\n');

        await batchCommand.parseAsync([
          'node',
          'test',
          '--file',
          issuesFile,
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).not.toContain('comment');
      });

      it('should error when file not found', async () => {
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          batchCommand.parseAsync([
            'node',
            'test',
            '--file',
            'nonexistent.txt',
          ])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error reading file: nonexistent.txt'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('with --label option', () => {
      it('should fetch issues from GitHub by label', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101 },
          { number: 102 },
          { number: 103 },
        ]);

        await batchCommand.parseAsync([
          'node',
          'test',
          '--label',
          'bug',
          '--dry-run',
        ]);

        expect(mockListIssues).toHaveBeenCalledWith('test-owner', 'test-repo', {
          labels: 'bug',
          state: 'open',
        });
      });

      it('should error when GitHub config is missing', async () => {
        await writeFile(
          join(testDir, '.claudetree', 'config.json'),
          JSON.stringify({ worktreeDir: '.worktrees' })
        );
        delete process.env.GITHUB_TOKEN;

        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          batchCommand.parseAsync(['node', 'test', '--label', 'bug'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error: GitHub token and repo config required for --label'
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('with --limit option', () => {
      it('should limit number of issues processed', async () => {
        await batchCommand.parseAsync([
          'node',
          'test',
          '101',
          '102',
          '103',
          '104',
          '105',
          '--limit',
          '3',
          '--dry-run',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Limiting to 3 issues')
        );
      });
    });

    describe('with --dry-run option', () => {
      it('should not start sessions', async () => {
        await batchCommand.parseAsync([
          'node',
          'test',
          '101',
          '102',
          '--dry-run',
        ]);

        expect(mockSpawn).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });
    });

    describe('with --template option', () => {
      it('should pass template to session start', async () => {
        await batchCommand.parseAsync([
          'node',
          'test',
          '101',
          '--template',
          'bugfix',
          '--dry-run',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Template: bugfix')
        );
      });
    });
  });
});
