import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock execSync
const mockExecSync = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

import { doctorCommand } from './doctor.js';

describe('doctorCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-doctor-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    originalEnv = { ...process.env };
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockExecSync.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Node.js check', () => {
    it('should pass for Node.js >= 18', async () => {
      // Setup mocks
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Node.js')
      );
    });
  });

  describe('Git Repository check', () => {
    it('should pass when inside git repo', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Git Repository')
      );
    });

    it('should fail when not inside git repo', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') {
          throw new Error('not a git repository');
        }
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(doctorCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Claude CLI check', () => {
    it('should pass when Claude CLI is installed', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0\nsome other info';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI')
      );
    });

    it('should fail when Claude CLI is not installed', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') throw new Error('command not found');
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(doctorCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('GitHub CLI check', () => {
    it('should pass (warn) when gh CLI is installed', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.40.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub CLI')
      );
    });

    it('should warn when gh CLI is not installed', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') throw new Error('command not found');
        if (cmd === 'gh auth status') throw new Error('not authenticated');
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      // gh CLI missing is a warning, not a failure
      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub CLI')
      );
    });
  });

  describe('GitHub Auth check', () => {
    it('should pass when gh is authenticated', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return 'Logged in as user';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub Auth')
      );
    });

    it('should pass when GITHUB_TOKEN is set', async () => {
      process.env.GITHUB_TOKEN = 'test-token';
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') throw new Error('not authenticated');
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub Auth')
      );
    });
  });

  describe('claudetree Init check', () => {
    it('should pass when initialized', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('claudetree Init')
      );
    });

    it('should fail when not initialized', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      (process.exit as unknown as Mock).mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(doctorCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Anthropic API Key check', () => {
    it('should pass when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345678901234567890';
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Anthropic API Key')
      );
    });

    it('should warn when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      // Missing API key is a warning, not failure
      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Anthropic API Key')
      );
    });
  });

  describe('--quiet option', () => {
    it('should only show failures and warnings', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );
      delete process.env.ANTHROPIC_API_KEY;

      await doctorCommand.parseAsync(['node', 'test', '--quiet']);

      // In quiet mode, only warnings/failures should be logged
      // Check that it completes without error
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('summary output', () => {
    it('should display ready message when all pass', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') return '.git';
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd === 'gh --version') return 'gh version 2.0.0';
        if (cmd === 'gh auth status') return '';
        throw new Error(`Unknown command: ${cmd}`);
      });
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.GITHUB_TOKEN = 'test-token';
      await mkdir(join(testDir, '.claudetree'), { recursive: true });
      await writeFile(
        join(testDir, '.claudetree', 'config.json'),
        '{}'
      );

      await doctorCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ready to use claudetree')
      );
    });
  });
});
