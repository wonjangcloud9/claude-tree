'use client';

import type { ToolApproval } from '@claudetree/shared';
import { ApprovalCard } from './ApprovalCard';

interface ApprovalListProps {
  approvals: ToolApproval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalList({
  approvals,
  onApprove,
  onReject,
}: ApprovalListProps) {
  const pending = approvals.filter((a) => a.status === 'pending');
  const resolved = approvals.filter((a) => a.status !== 'pending');

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#eab308' }}>
            Pending Approvals ({pending.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pending.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={() => onApprove(approval.id)}
                onReject={() => onReject(approval.id)}
              />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            History ({resolved.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resolved.slice(-10).map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        </div>
      )}

      {approvals.length === 0 && (
        <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>
          No tool approvals yet
        </div>
      )}
    </div>
  );
}
