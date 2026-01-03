import type { Session, SessionStatus } from '@claudetree/shared';

interface SessionCardProps {
  session: Session;
}

const STATUS_STYLES: Record<SessionStatus, { bg: string; color: string }> = {
  pending: { bg: '#eab30820', color: '#eab308' },
  running: { bg: '#22c55e20', color: '#22c55e' },
  paused: { bg: '#3b82f620', color: '#3b82f6' },
  completed: { bg: '#06b6d420', color: '#06b6d4' },
  failed: { bg: '#ef444420', color: '#ef4444' },
};

export function SessionCard({ session }: SessionCardProps) {
  const statusStyle = STATUS_STYLES[session.status];
  const shortId = session.id.slice(0, 8);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>
            {session.issueNumber ? `Issue #${session.issueNumber}` : `Session ${shortId}`}
          </h3>
          <code style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            {shortId}
          </code>
        </div>

        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          padding: '4px 10px',
          borderRadius: '9999px',
          background: statusStyle.bg,
          color: statusStyle.color,
          textTransform: 'uppercase',
        }}>
          {session.status}
        </span>
      </div>

      {session.prompt && (
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.prompt}
        </p>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}>
        <span>Created: {formatDate(session.createdAt)}</span>
        <span>Updated: {formatDate(session.updatedAt)}</span>
      </div>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
}
