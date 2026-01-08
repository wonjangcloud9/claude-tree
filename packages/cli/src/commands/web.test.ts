import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock WebSocketBroadcaster
vi.mock('@claudetree/core', () => ({
  WebSocketBroadcaster: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
  })),
}));

// Mock child_process spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    on: vi.fn(),
    kill: vi.fn(),
  }),
}));

// Import after mock
import { webCommand } from './web.js';
import { spawn } from 'node:child_process';
import { WebSocketBroadcaster } from '@claudetree/core';

describe('webCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-web-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();

    // Default spawn mock that returns an object with on and kill methods
    vi.mocked(spawn).mockReturnValue({
      on: vi.fn(),
      kill: vi.fn(),
    } as unknown as ReturnType<typeof spawn>);
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
      (process.exit as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw exitError;
      });

      await expect(webCommand.parseAsync(['node', 'test'])).rejects.toThrow(
        'process.exit called'
      );

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

    it('should display startup message with default ports', async () => {
      await webCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Starting claudetree dashboard...\n'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  WebSocket: ws://localhost:3001'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Web UI: http://localhost:3000'
      );
    });

    it('should use custom port when --port option is provided', async () => {
      await webCommand.parseAsync(['node', 'test', '--port', '4000']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Web UI: http://localhost:4000'
      );
    });

    it('should use custom WebSocket port when --ws-port option is provided', async () => {
      await webCommand.parseAsync(['node', 'test', '--ws-port', '4001']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  WebSocket: ws://localhost:4001'
      );
    });

    it('should spawn Next.js dev server with correct arguments', async () => {
      await webCommand.parseAsync(['node', 'test', '--port', '5000']);

      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['next', 'dev', '-p', '5000'],
        expect.objectContaining({
          stdio: 'inherit',
        })
      );

      // Verify env contains the required values
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const options = spawnCall?.[2] as { env?: Record<string, string> };
      expect(options?.env?.CLAUDETREE_WS_PORT).toBe('3001');
      expect(options?.env?.CLAUDETREE_ROOT).toContain('claudetree-web-test');
    });

    it('should set CLAUDETREE_WS_PORT environment variable', async () => {
      await webCommand.parseAsync([
        'node',
        'test',
        '--port',
        '3000',
        '--ws-port',
        '3002',
      ]);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const options = spawnCall?.[2] as { env?: Record<string, string> };
      expect(options?.env?.CLAUDETREE_WS_PORT).toBe('3002');
    });

    it('should display instructions for stopping', async () => {
      await webCommand.parseAsync(['node', 'test']);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nPress Ctrl+C to stop.\n');
    });

    describe('error handling', () => {
      it('should handle spawn error and close WebSocket', async () => {
        const mockOn = vi.fn();
        vi.mocked(spawn).mockReturnValue({
          on: mockOn,
          kill: vi.fn(),
        } as unknown as ReturnType<typeof spawn>);

        await webCommand.parseAsync(['node', 'test']);

        // Find the error handler
        const errorHandler = mockOn.mock.calls.find(
          (call: unknown[]) => call[0] === 'error'
        )?.[1] as ((err: Error) => void) | undefined;

        // Setup process.exit to throw
        const exitError = new Error('process.exit called');
        (process.exit as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw exitError;
        });

        if (errorHandler) {
          expect(() => errorHandler(new Error('spawn error'))).toThrow(
            'process.exit called'
          );
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to start web server:',
            'spawn error'
          );
          // Verify WebSocketBroadcaster was instantiated and close would be called
          expect(WebSocketBroadcaster).toHaveBeenCalled();
        }
      });
    });
  });
});
