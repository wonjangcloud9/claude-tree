export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ToolApproval {
  id: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ApprovalStatus;
  approvedBy: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}

export interface SerializedToolApproval
  extends Omit<ToolApproval, 'requestedAt' | 'resolvedAt'> {
  requestedAt: string;
  resolvedAt: string | null;
}
