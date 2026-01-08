import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initCommand } from './init.js';

describe('initCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-init-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic initialization', () => {
    it('should create .claudetree directory with config.json', async () => {
      await initCommand.parseAsync(['node', 'test']);

      const configPath = join(testDir, '.claudetree', 'config.json');
      await expect(access(configPath)).resolves.toBeUndefined();

      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(config.version).toBe('0.1.0');
      expect(config.worktreeDir).toBe('.worktrees');
    });

    it('should create worktree directory', async () => {
      await initCommand.parseAsync(['node', 'test']);

      const worktreePath = join(testDir, '.worktrees');
      await expect(access(worktreePath)).resolves.toBeUndefined();
    });

    it('should create templates directory with default templates', async () => {
      await initCommand.parseAsync(['node', 'test']);

      const templatesPath = join(testDir, '.claudetree', 'templates');
      await expect(access(templatesPath)).resolves.toBeUndefined();
    });

    it('should output success message', async () => {
      await initCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized claudetree')
      );
    });
  });

  describe('with --worktree-dir option', () => {
    it('should use custom worktree directory', async () => {
      await initCommand.parseAsync(['node', 'test', '-d', 'custom-worktrees']);

      const configPath = join(testDir, '.claudetree', 'config.json');
      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(config.worktreeDir).toBe('custom-worktrees');

      const customWorktreePath = join(testDir, 'custom-worktrees');
      await expect(access(customWorktreePath)).resolves.toBeUndefined();
    });
  });

  describe('with --slack option', () => {
    it('should add slack webhook to config', async () => {
      await initCommand.parseAsync([
        'node',
        'test',
        '--slack',
        'https://hooks.slack.com/services/xxx',
      ]);

      const configPath = join(testDir, '.claudetree', 'config.json');
      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(config.slack?.webhookUrl).toBe(
        'https://hooks.slack.com/services/xxx'
      );
    });
  });

  describe('when already initialized', () => {
    it('should error without --force flag', async () => {
      // Initialize first time
      await initCommand.parseAsync(['node', 'test']);
      consoleErrorSpy.mockClear();

      // Try to initialize again
      await initCommand.parseAsync(['node', 'test']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('already initialized')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reinitialize with --force flag', async () => {
      // Initialize first time
      await initCommand.parseAsync(['node', 'test']);

      // Reinitialize with force
      await initCommand.parseAsync(['node', 'test', '--force']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized claudetree')
      );
    });
  });
});
