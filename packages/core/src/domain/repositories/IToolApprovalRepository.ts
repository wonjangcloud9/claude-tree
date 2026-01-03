import type { ApprovalStatus, ToolApproval } from '@claudetree/shared';

export interface IToolApprovalRepository {
  findBySessionId(sessionId: string): Promise<ToolApproval[]>;
  findPending(sessionId: string): Promise<ToolApproval[]>;
  save(approval: ToolApproval): Promise<void>;
  updateStatus(
    id: string,
    status: ApprovalStatus,
    approvedBy?: string
  ): Promise<void>;
}
