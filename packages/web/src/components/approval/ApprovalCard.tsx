'use client';

import type { ApprovalStatus, ToolApproval } from '@claudetree/shared';

interface ApprovalCardProps {
  approval: ToolApproval;
  onApprove?: () => void;
  onReject?: () => void;
}

const STATUS_STYLES: Record<ApprovalStatus, { bg: string; color: string }> = {
  pending: { bg: '#eab30820', color: '#eab308' },
  approved: { bg: '#22c55e20', color: '#22c55e' },
  rejected: { bg: '#ef444420', color: '#ef4444' },
};

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const style = STATUS_STYLES[approval.status];
  const isPending = approval.status === 'pending';

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>{approval.toolName}</span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            background: style.bg,
            color: style.color,
            textTransform: 'uppercase',
          }}
        >
          {approval.status}
        </span>
      </div>

      <pre
        style={{
          fontSize: '12px',
          background: 'var(--bg-tertiary)',
          padding: '8px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '100px',
          margin: '0 0 8px 0',
        }}
      >
        {JSON.stringify(approval.parameters, null, 2)}
      </pre>

      {isPending && onApprove && onReject && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              padding: '8px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Approve
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: '8px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
