'use client';

import type { CodeReview, ReviewStatus } from '@claudetree/shared';

interface CodeReviewPanelProps {
  review: CodeReview | null;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}

const STATUS_STYLES: Record<ReviewStatus, { bg: string; color: string }> = {
  pending: { bg: '#eab30820', color: '#eab308' },
  approved: { bg: '#22c55e20', color: '#22c55e' },
  rejected: { bg: '#ef444420', color: '#ef4444' },
  changes_requested: { bg: '#f9731620', color: '#f97316' },
};

export function CodeReviewPanel({
  review,
  onApprove,
  onReject,
  onRequestChanges,
}: CodeReviewPanelProps) {
  if (!review) {
    return (
      <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>
        No code review requested
      </div>
    );
  }

  const style = STATUS_STYLES[review.status];
  const isPending = review.status === 'pending';

  const totalAdditions = review.changes.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = review.changes.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '16px' }}>Code Review</h4>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: style.bg,
            color: style.color,
            textTransform: 'uppercase',
          }}
        >
          {review.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>
          <span style={{ color: '#22c55e' }}>+{totalAdditions}</span>
          <span style={{ margin: '0 8px', color: 'var(--text-secondary)' }}>/</span>
          <span style={{ color: '#ef4444' }}>-{totalDeletions}</span>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
            in {review.changes.length} files
          </span>
        </div>

        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {review.changes.map((change) => (
            <div
              key={change.path}
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{change.path}</span>
              <span>
                <span style={{ color: '#22c55e' }}>+{change.additions}</span>
                {' '}
                <span style={{ color: '#ef4444' }}>-{change.deletions}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {isPending && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              padding: '10px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Approve
          </button>
          <button
            onClick={onRequestChanges}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Request Changes
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: '10px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Reject
          </button>
        </div>
      )}

      {review.comment && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            background: 'var(--bg-tertiary)',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          {review.comment}
        </div>
      )}
    </div>
  );
}
