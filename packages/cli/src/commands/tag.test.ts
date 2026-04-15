import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const mockFindAll = vi.fn();
const mockSave = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: class {
    findAll = mockFindAll;
    save = mockSave;
  },
}));

import { tagCommand } from './tag.js';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id-123456',
  worktreeId: 'worktree-id-456',
  claudeSessionId: null,
  status: 'completed',
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
  lastError: null,
  tags: [],
  ...overrides,
});

describe('tagCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-tag-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    await mkdir(join(testDir, '.claudetree'), { recursive: true });
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindAll.mockReset();
    mockSave.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should add tags to a session', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);
    mockSave.mockResolvedValue(undefined);

    await tagCommand.parseAsync(['node', 'test', 'test-ses', 'add', 'urgent', 'bug']);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['urgent', 'bug'] }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Added tags'),
    );
  });

  it('should remove tags from a session', async () => {
    const session = createMockSession({ tags: ['urgent', 'bug', 'feature'] });
    mockFindAll.mockResolvedValue([session]);
    mockSave.mockResolvedValue(undefined);

    await tagCommand.parseAsync(['node', 'test', 'test-ses', 'remove', 'bug']);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['urgent', 'feature'] }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Removed tags'),
    );
  });

  it('should not duplicate existing tags when adding', async () => {
    const session = createMockSession({ tags: ['urgent'] });
    mockFindAll.mockResolvedValue([session]);
    mockSave.mockResolvedValue(undefined);

    await tagCommand.parseAsync(['node', 'test', 'test-ses', 'add', 'urgent', 'new']);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['urgent', 'new'] }),
    );
  });

  it('should match session by ID prefix', async () => {
    const session = createMockSession();
    mockFindAll.mockResolvedValue([session]);
    mockSave.mockResolvedValue(undefined);

    await tagCommand.parseAsync(['node', 'test', 'test-ses', 'add', 'v1']);

    expect(mockSave).toHaveBeenCalled();
  });

  it('should error on invalid action', async () => {
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      tagCommand.parseAsync(['node', 'test', 'abc', 'invalid', 'tag1']),
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid action'),
    );
  });

  it('should error when session not found', async () => {
    mockFindAll.mockResolvedValue([]);
    (process.exit as unknown as Mock).mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      tagCommand.parseAsync(['node', 'test', 'nonexistent', 'add', 'tag1']),
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('not found'),
    );
  });

  it('should display current tags after modification', async () => {
    const session = createMockSession({ tags: ['existing'] });
    mockFindAll.mockResolvedValue([session]);
    mockSave.mockResolvedValue(undefined);

    await tagCommand.parseAsync(['node', 'test', 'test-ses', 'add', 'new']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Current tags:'),
    );
  });
});
