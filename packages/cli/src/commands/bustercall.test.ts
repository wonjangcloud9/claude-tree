import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Create mock functions at module scope
const mockSpawn = vi.fn();
const mockExec = vi.fn();

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
  exec: (cmd: string, callback: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
    mockExec(cmd).then(
      (result: { stdout: string }) => callback(null, { stdout: result.stdout, stderr: '' }),
      (error: Error) => callback(error, { stdout: '', stderr: '' })
    );
  },
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

import { bustercallCommand } from './bustercall.js';

describe('bustercallCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleClearSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-bustercall-test-'));
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
    mockExec.mockReset();
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

      await expect(bustercallCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: claudetree not initialized. Run "claudetree init" first.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('when initialized without GitHub config', () => {
    beforeEach(async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        JSON.stringify({ worktreeDir: '.worktrees' })
      );
      delete process.env.GITHUB_TOKEN;
    });

    it('should display error about missing GitHub config', async () => {
      const exitError = new Error('process.exit called');
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw exitError;
      });

      await expect(bustercallCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: GitHub configuration required for bustercall.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('when initialized with GitHub config', () => {
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
      // Mock gh pr list
      mockExec.mockResolvedValue({ stdout: '[]' });
    });

    describe('when no issues found', () => {
      it('should exit with message', async () => {
        mockListIssues.mockResolvedValue([]);
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation((code) => {
          if (code === 0) throw exitError;
        });

        await expect(bustercallCommand.parseAsync(['node', 'test'])).rejects.toThrow(
          'process.exit called'
        );

        expect(consoleLogSpy).toHaveBeenCalledWith(
          'No open issues found matching criteria.'
        );
        expect(process.exit).toHaveBeenCalledWith(0);
      });
    });

    describe('with --dry-run option', () => {
      it('should show issues without starting sessions', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix bug A', labels: [] },
          { number: 102, title: 'Fix bug B', labels: [] },
        ]);

        await bustercallCommand.parseAsync(['node', 'test', '--dry-run']);

        expect(mockSpawn).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });

      it('should categorize issues by conflict potential', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix bug A', labels: [] },
          { number: 102, title: 'Update package.json', labels: ['dependencies'] },
        ]);

        await bustercallCommand.parseAsync(['node', 'test', '--dry-run']);

        // Safe issues should be shown
        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('#101');
        expect(logCalls).toContain('#102');
      });
    });

    describe('with --label option', () => {
      it('should filter issues by label', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Bug fix', labels: ['bug'] },
        ]);

        await bustercallCommand.parseAsync(['node', 'test', '--label', 'bug', '--dry-run']);

        expect(mockListIssues).toHaveBeenCalledWith('test-owner', 'test-repo', {
          labels: 'bug',
          state: 'open',
        });
      });
    });

    describe('with --exclude option', () => {
      it('should exclude specified issue numbers', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix bug A', labels: [] },
          { number: 102, title: 'Fix bug B', labels: [] },
          { number: 103, title: 'Fix bug C', labels: [] },
        ]);

        await bustercallCommand.parseAsync([
          'node',
          'test',
          '--exclude',
          '102',
          '--dry-run',
        ]);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('#101');
        expect(logCalls).not.toContain('Fix bug B');
        expect(logCalls).toContain('#103');
      });
    });

    describe('with --limit option', () => {
      it('should limit number of issues', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix A', labels: [] },
          { number: 102, title: 'Fix B', labels: [] },
          { number: 103, title: 'Fix C', labels: [] },
          { number: 104, title: 'Fix D', labels: [] },
        ]);

        await bustercallCommand.parseAsync([
          'node',
          'test',
          '--limit',
          '2',
          '--dry-run',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Found 4 issues, limiting to 2')
        );
      });
    });

    describe('with --sequential option', () => {
      it('should indicate sequential execution in dry-run', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix A', labels: [] },
          { number: 102, title: 'Fix B', labels: [] },
        ]);

        await bustercallCommand.parseAsync([
          'node',
          'test',
          '--sequential',
          '--dry-run',
        ]);

        // In sequential mode, all issues are processed
        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('#101');
        expect(logCalls).toContain('#102');
      });
    });

    describe('PR filtering', () => {
      it('should skip issues with existing PRs', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix A', labels: [] },
          { number: 102, title: 'Fix B', labels: [] },
        ]);
        // Mock gh pr list to return PR referencing issue 102
        mockExec.mockResolvedValue({
          stdout: JSON.stringify([
            { number: 1, title: 'PR for #102', body: 'Fixes #102' },
          ]),
        });

        await bustercallCommand.parseAsync(['node', 'test', '--dry-run']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Skipped 1 issue(s) with existing PRs')
        );
      });
    });

    describe('conflict detection', () => {
      it('should detect issues with config-related labels', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Add feature', labels: [] },
          { number: 102, title: 'Update deps', labels: ['dependencies'] },
        ]);

        await bustercallCommand.parseAsync(['node', 'test', '--dry-run']);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('Potential Conflict');
      });

      it('should detect issues with config keywords in title', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Update package.json', labels: [] },
          { number: 102, title: 'Fix bug in login', labels: [] },
        ]);

        await bustercallCommand.parseAsync(['node', 'test', '--dry-run']);

        const logCalls = consoleLogSpy.mock.calls.flat().join('\n');
        expect(logCalls).toContain('Potential Conflict');
      });
    });

    describe('with --template option', () => {
      it('should pass template for dry-run display', async () => {
        mockListIssues.mockResolvedValue([
          { number: 101, title: 'Fix bug', labels: [] },
        ]);

        await bustercallCommand.parseAsync([
          'node',
          'test',
          '--template',
          'bugfix',
          '--dry-run',
        ]);

        // Template is used when starting sessions, not shown in dry-run
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Dry Run]')
        );
      });
    });
  });
});
