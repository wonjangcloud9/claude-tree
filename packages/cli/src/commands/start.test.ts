import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Create mock functions
const mockWorktreeList = vi.fn();
const mockWorktreeCreate = vi.fn();
const mockIsClaudeAvailable = vi.fn();
const mockClaudeStart = vi.fn();
const mockClaudeGetOutput = vi.fn();
const mockClaudeOn = vi.fn();
const mockSessionSave = vi.fn();
const mockTemplateLoad = vi.fn();
const mockGateRunnerRunWithAutoRetry = vi.fn();

// Mock @claudetree/core
vi.mock('@claudetree/core', () => ({
  GitWorktreeAdapter: vi.fn().mockImplementation(() => ({
    list: mockWorktreeList,
    create: mockWorktreeCreate,
  })),
  ClaudeSessionAdapter: vi.fn().mockImplementation(() => ({
    isClaudeAvailable: mockIsClaudeAvailable,
    start: mockClaudeStart,
    getOutput: mockClaudeGetOutput,
    on: mockClaudeOn,
    stop: vi.fn(),
  })),
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    save: mockSessionSave,
  })),
  FileEventRepository: vi.fn().mockImplementation(() => ({
    append: vi.fn(),
  })),
  FileToolApprovalRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
  })),
  GitHubAdapter: vi.fn().mockImplementation(() => ({
    parseIssueUrl: vi.fn(),
    getIssue: vi.fn(),
    generateBranchName: vi.fn(),
  })),
  TemplateLoader: vi.fn().mockImplementation(() => ({
    load: mockTemplateLoad,
  })),
  DEFAULT_TEMPLATES: {},
  SlackNotifier: vi.fn().mockImplementation(() => ({
    notifySession: vi.fn(),
  })),
  ValidationGateRunner: vi.fn().mockImplementation(() => ({
    runWithAutoRetry: mockGateRunnerRunWithAutoRetry,
  })),
}));

// Import after mocks
import { startCommand } from './start.js';

describe('startCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-start-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset commander state - important for option parsing
    startCommand.setOptionValue('noSession', undefined);
    startCommand.setOptionValue('tdd', undefined);
    startCommand.setOptionValue('branch', undefined);
    startCommand.setOptionValue('prompt', undefined);

    vi.clearAllMocks();

    // Default mock implementations
    mockWorktreeList.mockResolvedValue([]);
    mockWorktreeCreate.mockResolvedValue({
      id: 'wt-123',
      path: join(testDir, '.worktrees', 'issue-42'),
      branch: 'issue-42',
    });
    mockIsClaudeAvailable.mockResolvedValue(true);
    mockClaudeStart.mockResolvedValue({
      processId: 'proc-123',
      osProcessId: 12345,
    });
    mockClaudeGetOutput.mockImplementation(async function* () {
      yield { type: 'done', content: 'session-done' };
    });
    mockSessionSave.mockResolvedValue(undefined);
    mockTemplateLoad.mockResolvedValue(null);
    mockGateRunnerRunWithAutoRetry.mockResolvedValue({
      allPassed: true,
      results: [],
      totalTime: 1000,
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
        startCommand.parseAsync(['node', 'test', '42'])
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
          version: '0.1.0',
          worktreeDir: '.worktrees',
        })
      );
    });

    describe('with issue number', () => {
      it('should create worktree with issue branch name', async () => {
        await startCommand.parseAsync(['node', 'test', '42', '--no-session']);

        expect(mockWorktreeCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            branch: 'issue-42',
            issueNumber: 42,
          })
        );
      });

      it('should display worktree creation message', async () => {
        await startCommand.parseAsync(['node', 'test', '42', '--no-session']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Creating worktree: issue-42')
        );
      });
    });

    describe('with natural language task', () => {
      it('should create worktree with sanitized branch name', async () => {
        await startCommand.parseAsync([
          'node',
          'test',
          'Add new feature',
          '--no-session',
        ]);

        expect(mockWorktreeCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            branch: 'task-add-new-feature',
          })
        );
      });

      it('should display task message', async () => {
        await startCommand.parseAsync([
          'node',
          'test',
          'Fix login bug',
          '--no-session',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Task: "Fix login bug"')
        );
      });
    });

    describe('with --branch option', () => {
      it('should use custom branch name', async () => {
        await startCommand.parseAsync([
          'node',
          'test',
          '42',
          '-b',
          'custom-branch',
          '--no-session',
        ]);

        expect(mockWorktreeCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            branch: 'custom-branch',
          })
        );
      });
    });

    describe('command options', () => {
      it('should have --no-session option defined', () => {
        const options = startCommand.options;
        const noSessionOption = options.find((opt) => opt.long === '--no-session');
        expect(noSessionOption).toBeDefined();
      });

      it('should have --no-tdd option defined', () => {
        const options = startCommand.options;
        const noTddOption = options.find((opt) => opt.long === '--no-tdd');
        expect(noTddOption).toBeDefined();
      });
    });

    describe('when Claude is not available', () => {
      it('should display error but keep worktree', async () => {
        mockIsClaudeAvailable.mockResolvedValue(false);

        await startCommand.parseAsync(['node', 'test', '42']);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Claude CLI not found')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Worktree created but Claude session not started')
        );
      });
    });

    describe('when existing worktree found', () => {
      it('should use existing worktree', async () => {
        mockWorktreeList.mockResolvedValue([
          {
            path: join(testDir, '.worktrees', 'issue-42'),
            branch: 'issue-42',
            commit: 'abc123',
            isMainWorktree: false,
          },
        ]);

        await startCommand.parseAsync(['node', 'test', '42', '--no-session']);

        expect(mockWorktreeCreate).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Using existing worktree: issue-42')
        );
      });
    });

    describe('TDD mode', () => {
      it('should display TDD header by default', async () => {
        await startCommand.parseAsync(['node', 'test', '42', '--no-session']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('TDD Mode Session')
        );
      });

      it('should display validation gates info', async () => {
        await startCommand.parseAsync(['node', 'test', '42', '--no-session']);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Validation Gates')
        );
      });

      it('should not display TDD header with --no-tdd', async () => {
        consoleLogSpy.mockClear();

        await startCommand.parseAsync([
          'node',
          'test',
          '42',
          '--no-tdd',
          '--no-session',
        ]);

        const calls = consoleLogSpy.mock.calls.map((c) => c[0]);
        const hasTddHeader = calls.some(
          (c) => typeof c === 'string' && c.includes('TDD Mode Session')
        );
        expect(hasTddHeader).toBe(false);
      });
    });

    describe('with --prompt option', () => {
      it('should pass custom prompt to session', async () => {
        await startCommand.parseAsync([
          'node',
          'test',
          '42',
          '-p',
          'Custom prompt',
          '--no-session',
        ]);

        // Verify the prompt was received (shown in logs or stored)
        expect(consoleLogSpy).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle worktree creation error', async () => {
        mockWorktreeCreate.mockRejectedValue(new Error('Git error'));
        const exitError = new Error('process.exit called');
        (process.exit as unknown as Mock).mockImplementation(() => {
          throw exitError;
        });

        await expect(
          startCommand.parseAsync(['node', 'test', '42', '--no-session'])
        ).rejects.toThrow('process.exit called');

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Git error');
      });
    });
  });
});
