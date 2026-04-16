import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();
const mockDelete = vi.fn();
const mockSave = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
    delete = mockDelete;
    save = mockSave;
  },
}));

const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

import { rerunCommand } from './rerun.js';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id-123456',
  worktreeId: 'worktree-id-456',
  claudeSessionId: null,
  status: 'failed',
  issueNumber: 42,
  prompt: 'Fix the bug',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  processId: null,
  osProcessId: null,
  lastHeartbeat: null,
  errorCount: 0,
  worktreePath: null,
  usage: null,
  progress: null,
  retryCount: 0,
  lastError: 'Test failed',
  tags: ['bugfix', 'bustercall:batch-abc'],
  ...overrides,
});

describe('rerunCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-rerun-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockSave.mockReset();
    mockSpawn.mockReset().mockReturnValue({ unref: vi.fn() });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should rerun a failed session', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);

    await rerunCommand.parseAsync(['node', 'test', 'test-ses']);

    expect(mockDelete).toHaveBeenCalledWith('test-session-id-123456');
    expect(mockSpawn).toHaveBeenCalledWith(
      'claudetree',
      expect.arrayContaining(['start', '42']),
      expect.any(Object),
    );
  });

  it('should preserve original tags and add rerun tag', async () => {
    const session = createMockSession({ tags: ['feature'] });
    mockFindAll.mockResolvedValue([session]);

    await rerunCommand.parseAsync(['node', 'test', 'test-ses']);

    const spawnArgs = mockSpawn.mock.calls[0]![1] as string[];
    expect(spawnArgs).toContain('--tag');
    expect(spawnArgs).toContain('feature');
    expect(spawnArgs.some((a: string) => a.startsWith('rerun:'))).toBe(true);
  });

  it('should keep original session with --keep flag', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);

    await rerunCommand.parseAsync(['node', 'test', 'test-ses', '--keep']);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should reject rerun of running sessions', async () => {
    const session = createMockSession({ status: 'running' });
    mockFindAll.mockResolvedValue([session]);
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      rerunCommand.parseAsync(['node', 'test', 'test-ses']),
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('still running'),
    );
  });

  it('should error when session not found', async () => {
    mockFindAll.mockResolvedValue([]);
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      rerunCommand.parseAsync(['node', 'test', 'nonexistent']),
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No session found'),
    );
  });

  it('should allow template override', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);

    await rerunCommand.parseAsync(['node', 'test', 'test-ses', '--template', 'refactor']);

    const spawnArgs = mockSpawn.mock.calls[0]![1] as string[];
    expect(spawnArgs).toContain('--template');
    expect(spawnArgs).toContain('refactor');
  });

  it('should rerun completed sessions', async () => {
    const session = createMockSession({ status: 'completed' });
    mockFindAll.mockResolvedValue([session]);

    await rerunCommand.parseAsync(['node', 'test', 'test-ses']);

    expect(mockSpawn).toHaveBeenCalled();
  });
});
