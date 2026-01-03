import { randomUUID } from 'node:crypto';
import type {
  CodeReview,
  EventType,
  FileChange,
  SessionEvent,
  ToolApproval,
} from '@claudetree/shared';
import type { IEventRepository } from '../domain/repositories/IEventRepository.js';
import type { IToolApprovalRepository } from '../domain/repositories/IToolApprovalRepository.js';
import type { ICodeReviewRepository } from '../domain/repositories/ICodeReviewRepository.js';
import type { WebSocketBroadcaster } from '../infra/websocket/WebSocketServer.js';

export class SessionManager {
  constructor(
    private readonly eventRepo: IEventRepository,
    private readonly approvalRepo: IToolApprovalRepository,
    private readonly reviewRepo: ICodeReviewRepository,
    private readonly broadcaster: WebSocketBroadcaster
  ) {}

  async recordEvent(
    sessionId: string,
    type: EventType,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<SessionEvent> {
    const event: SessionEvent = {
      id: randomUUID(),
      sessionId,
      type,
      content,
      metadata,
      timestamp: new Date(),
    };

    await this.eventRepo.append(event);

    this.broadcaster.broadcast({
      type: 'event:created',
      payload: { sessionId, event },
      timestamp: new Date(),
    });

    return event;
  }

  async requestApproval(
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<ToolApproval> {
    const approval: ToolApproval = {
      id: randomUUID(),
      sessionId,
      toolName,
      parameters,
      status: 'pending',
      approvedBy: null,
      requestedAt: new Date(),
      resolvedAt: null,
    };

    await this.approvalRepo.save(approval);

    this.broadcaster.broadcast({
      type: 'approval:requested',
      payload: { sessionId, approval },
      timestamp: new Date(),
    });

    return approval;
  }

  async resolveApproval(
    id: string,
    approved: boolean,
    approvedBy: string
  ): Promise<void> {
    const status = approved ? 'approved' : 'rejected';
    await this.approvalRepo.updateStatus(id, status, approvedBy);

    this.broadcaster.broadcast({
      type: 'approval:resolved',
      payload: { id, status, approvedBy },
      timestamp: new Date(),
    });
  }

  async requestReview(
    sessionId: string,
    changes: FileChange[]
  ): Promise<CodeReview> {
    const review: CodeReview = {
      id: randomUUID(),
      sessionId,
      status: 'pending',
      comment: null,
      changes,
      requestedAt: new Date(),
      resolvedAt: null,
    };

    await this.reviewRepo.save(review);

    this.broadcaster.broadcast({
      type: 'review:requested',
      payload: { sessionId, review },
      timestamp: new Date(),
    });

    return review;
  }

  async resolveReview(
    id: string,
    approved: boolean,
    comment?: string
  ): Promise<void> {
    const status = approved ? 'approved' : 'rejected';
    await this.reviewRepo.updateStatus(id, status, comment);

    this.broadcaster.broadcast({
      type: 'review:resolved',
      payload: { id, status, comment },
      timestamp: new Date(),
    });
  }
}
