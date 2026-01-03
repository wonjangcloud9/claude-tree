import type { Session } from '@claudetree/shared';
import { SessionCard } from './SessionCard';

interface SessionListProps {
  sessions: Session[];
  onRefresh: () => void;
}

export function SessionList({ sessions, onRefresh }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px',
        color: 'var(--text-secondary)',
      }}>
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>No active sessions</p>
        <p style={{ fontSize: '14px' }}>
          Run <code style={{
            background: 'var(--bg-tertiary)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>claudetree start {'<issue>'}</code> to create one
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Sessions</h2>
        <button
          onClick={onRefresh}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      }}>
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}
