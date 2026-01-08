import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorktreeSyncService } from './WorktreeSyncService.js';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';
import type { IWorktreeRepository } from '../domain/repositories/IWorktreeRepository.js';
import type { Session, WorktreeListItem } from '@claudetree/shared';

describe('WorktreeSyncService', () => {
  let sessionRepo: ISessionRepository;
  let worktreeRepo: IWorktreeRepository;
  let service: WorktreeSyncService;

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'test-session-1',
    worktreeId: '/path/to/worktree',
    claudeSessionId: null,
    status: 'pending',
    issueNumber: null,
    prompt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    processId: null,
    osProcessId: null,
    lastHeartbeat: null,
    errorCount: 0,
    worktreePath: null,
    usage: null,
    progress: null,
    ...overrides,
  });

  const createMockWorktree = (
    overrides: Partial<WorktreeListItem> = {}
  ): WorktreeListItem => ({
    path: '/path/to/worktree',
    branch: 'feature-branch',
    commit: 'abc123',
    isMainWorktree: false,
    ...overrides,
  });

  beforeEach(() => {
    sessionRepo = {
      findById: vi.fn(),
      findByWorktreeId: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    };

    worktreeRepo = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      remove: vi.fn(),
      prune: vi.fn(),
    };

    service = new WorktreeSyncService(sessionRepo, worktreeRepo);
  });

  describe('sync', () => {
    it('should skip main worktree', async () => {
      const mainWorktree = createMockWorktree({
        path: '/main/repo',
        isMainWorktree: true,
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([mainWorktree]);

      const result = await service.sync();

      expect(result).toEqual([]);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('should create session for worktree without existing session', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/issue-42-feature',
        branch: 'issue-42-feature',
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);
      vi.mocked(sessionRepo.findAll).mockResolvedValue([]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
      expect(result[0]!.worktreeId).toBe('/worktrees/issue-42-feature');
      expect(result[0]!.issueNumber).toBe(42);
    });

    it('should not create session when session already exists by worktreeId', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/issue-10-fix',
        branch: 'issue-10-fix',
      });
      const existingSession = createMockSession({
        worktreeId: '/worktrees/issue-10-fix',
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);
      vi.mocked(sessionRepo.findAll).mockResolvedValue([existingSession]);

      const result = await service.sync();

      expect(result).toEqual([]);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('should not create session when session matches by issue number', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/issue-99-new-path',
        branch: 'issue-99-feature',
      });
      const existingSession = createMockSession({
        worktreeId: '/old/path',
        issueNumber: 99,
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);
      vi.mocked(sessionRepo.findAll).mockResolvedValue([existingSession]);

      const result = await service.sync();

      expect(result).toEqual([]);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('should handle multiple worktrees and create sessions only for new ones', async () => {
      const mainWorktree = createMockWorktree({
        path: '/main',
        isMainWorktree: true,
      });
      const existingWorktree = createMockWorktree({
        path: '/worktrees/issue-1',
        branch: 'issue-1-existing',
      });
      const newWorktree = createMockWorktree({
        path: '/worktrees/issue-2',
        branch: 'issue-2-new',
      });
      const existingSession = createMockSession({
        worktreeId: '/worktrees/issue-1',
        issueNumber: 1,
      });

      vi.mocked(worktreeRepo.list).mockResolvedValue([
        mainWorktree,
        existingWorktree,
        newWorktree,
      ]);
      vi.mocked(sessionRepo.findAll).mockResolvedValue([existingSession]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      expect(result[0]!.worktreeId).toBe('/worktrees/issue-2');
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should create session without issue number for non-issue branches', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/feature-branch',
        branch: 'feature-branch',
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      expect(result[0]!.issueNumber).toBeNull();
    });

    it('should return empty array when no worktrees exist', async () => {
      vi.mocked(worktreeRepo.list).mockResolvedValue([]);

      const result = await service.sync();

      expect(result).toEqual([]);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('should create new session when worktree branch is null', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/detached-head',
        branch: '',
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      expect(result[0]!.issueNumber).toBeNull();
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should not match worktree with null branch to session with issue number', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/detached',
        branch: '',
      });
      const existingSession = createMockSession({
        worktreeId: '/other/path',
        issueNumber: 5,
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);
      vi.mocked(sessionRepo.findAll).mockResolvedValue([existingSession]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should set correct session fields from worktree', async () => {
      const worktree = createMockWorktree({
        path: '/worktrees/issue-123-test',
        branch: 'issue-123-test',
      });
      vi.mocked(worktreeRepo.list).mockResolvedValue([worktree]);

      const result = await service.sync();

      expect(result).toHaveLength(1);
      const session = result[0]!;
      expect(session.id).toBeDefined();
      expect(session.worktreeId).toBe('/worktrees/issue-123-test');
      expect(session.claudeSessionId).toBeNull();
      expect(session.status).toBe('pending');
      expect(session.issueNumber).toBe(123);
      expect(session.prompt).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
      expect(session.processId).toBeNull();
      expect(session.osProcessId).toBeNull();
      expect(session.lastHeartbeat).toBeNull();
      expect(session.errorCount).toBe(0);
      expect(session.worktreePath).toBe('/worktrees/issue-123-test');
      expect(session.usage).toBeNull();
      expect(session.progress).toBeNull();
    });
  });
});
