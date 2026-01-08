import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './SessionManager.js';
import type { IEventRepository } from '../domain/repositories/IEventRepository.js';
import type { IToolApprovalRepository } from '../domain/repositories/IToolApprovalRepository.js';
import type { ICodeReviewRepository } from '../domain/repositories/ICodeReviewRepository.js';
import type { WebSocketBroadcaster } from '../infra/websocket/WebSocketServer.js';

describe('SessionManager', () => {
  let eventRepo: IEventRepository;
  let approvalRepo: IToolApprovalRepository;
  let reviewRepo: ICodeReviewRepository;
  let broadcaster: WebSocketBroadcaster;
  let sessionManager: SessionManager;

  beforeEach(() => {
    eventRepo = {
      findBySessionId: vi.fn(),
      append: vi.fn(),
      getLatest: vi.fn(),
      clear: vi.fn(),
    };

    approvalRepo = {
      findBySessionId: vi.fn(),
      findPending: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn(),
    };

    reviewRepo = {
      findBySessionId: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn(),
    };

    broadcaster = {
      broadcast: vi.fn(),
    } as unknown as WebSocketBroadcaster;

    sessionManager = new SessionManager(
      eventRepo,
      approvalRepo,
      reviewRepo,
      broadcaster
    );
  });

  describe('recordEvent', () => {
    it('should create event with correct structure and save to repository', async () => {
      const sessionId = 'session-123';
      const type = 'output';
      const content = 'Test output content';
      const metadata = { key: 'value' };

      const result = await sessionManager.recordEvent(
        sessionId,
        type,
        content,
        metadata
      );

      expect(result).toMatchObject({
        sessionId,
        type,
        content,
        metadata,
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(eventRepo.append).toHaveBeenCalledWith(result);
    });

    it('should broadcast event:created message', async () => {
      const sessionId = 'session-123';

      const result = await sessionManager.recordEvent(
        sessionId,
        'output',
        'content'
      );

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'event:created',
          payload: { sessionId, event: result },
        })
      );
    });

    it('should generate unique id for each event', async () => {
      const result1 = await sessionManager.recordEvent('s1', 'output', 'c1');
      const result2 = await sessionManager.recordEvent('s1', 'output', 'c2');

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('requestApproval', () => {
    it('should create approval with correct structure and save to repository', async () => {
      const sessionId = 'session-123';
      const toolName = 'Bash';
      const parameters = { command: 'ls -la' };

      const result = await sessionManager.requestApproval(
        sessionId,
        toolName,
        parameters
      );

      expect(result).toMatchObject({
        sessionId,
        toolName,
        parameters,
        status: 'pending',
        approvedBy: null,
        resolvedAt: null,
      });
      expect(result.id).toBeDefined();
      expect(result.requestedAt).toBeInstanceOf(Date);
      expect(approvalRepo.save).toHaveBeenCalledWith(result);
    });

    it('should broadcast approval:requested message', async () => {
      const sessionId = 'session-123';

      const result = await sessionManager.requestApproval(
        sessionId,
        'Bash',
        { command: 'pwd' }
      );

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'approval:requested',
          payload: { sessionId, approval: result },
        })
      );
    });

    it('should generate unique id for each approval', async () => {
      const result1 = await sessionManager.requestApproval('s1', 'Bash', {});
      const result2 = await sessionManager.requestApproval('s1', 'Read', {});

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('resolveApproval', () => {
    it('should update approval status to approved', async () => {
      const id = 'approval-123';
      const approvedBy = 'user@example.com';

      await sessionManager.resolveApproval(id, true, approvedBy);

      expect(approvalRepo.updateStatus).toHaveBeenCalledWith(
        id,
        'approved',
        approvedBy
      );
    });

    it('should update approval status to rejected', async () => {
      const id = 'approval-123';
      const approvedBy = 'user@example.com';

      await sessionManager.resolveApproval(id, false, approvedBy);

      expect(approvalRepo.updateStatus).toHaveBeenCalledWith(
        id,
        'rejected',
        approvedBy
      );
    });

    it('should broadcast approval:resolved message with approved status', async () => {
      const id = 'approval-123';
      const approvedBy = 'user@example.com';

      await sessionManager.resolveApproval(id, true, approvedBy);

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'approval:resolved',
          payload: { id, status: 'approved', approvedBy },
        })
      );
    });

    it('should broadcast approval:resolved message with rejected status', async () => {
      const id = 'approval-123';
      const approvedBy = 'user@example.com';

      await sessionManager.resolveApproval(id, false, approvedBy);

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'approval:resolved',
          payload: { id, status: 'rejected', approvedBy },
        })
      );
    });
  });

  describe('requestReview', () => {
    it('should create review with correct structure and save to repository', async () => {
      const sessionId = 'session-123';
      const changes = [
        {
          path: 'src/index.ts',
          additions: 1,
          deletions: 0,
          status: 'modified' as const,
        },
      ];

      const result = await sessionManager.requestReview(sessionId, changes);

      expect(result).toMatchObject({
        sessionId,
        status: 'pending',
        comment: null,
        changes,
        resolvedAt: null,
      });
      expect(result.id).toBeDefined();
      expect(result.requestedAt).toBeInstanceOf(Date);
      expect(reviewRepo.save).toHaveBeenCalledWith(result);
    });

    it('should broadcast review:requested message', async () => {
      const sessionId = 'session-123';
      const changes = [
        { path: 'README.md', additions: 5, deletions: 0, status: 'added' as const },
      ];

      const result = await sessionManager.requestReview(sessionId, changes);

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:requested',
          payload: { sessionId, review: result },
        })
      );
    });

    it('should generate unique id for each review', async () => {
      const result1 = await sessionManager.requestReview('s1', []);
      const result2 = await sessionManager.requestReview('s1', []);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('resolveReview', () => {
    it('should update review status to approved', async () => {
      const id = 'review-123';

      await sessionManager.resolveReview(id, true);

      expect(reviewRepo.updateStatus).toHaveBeenCalledWith(
        id,
        'approved',
        undefined
      );
    });

    it('should update review status to rejected with comment', async () => {
      const id = 'review-123';
      const comment = 'Please fix the formatting';

      await sessionManager.resolveReview(id, false, comment);

      expect(reviewRepo.updateStatus).toHaveBeenCalledWith(
        id,
        'rejected',
        comment
      );
    });

    it('should broadcast review:resolved message with approved status', async () => {
      const id = 'review-123';

      await sessionManager.resolveReview(id, true);

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:resolved',
          payload: { id, status: 'approved', comment: undefined },
        })
      );
    });

    it('should broadcast review:resolved message with rejected status and comment', async () => {
      const id = 'review-123';
      const comment = 'Needs more tests';

      await sessionManager.resolveReview(id, false, comment);

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:resolved',
          payload: { id, status: 'rejected', comment },
        })
      );
    });
  });
});
