'use client';

import { useState } from 'react';
import type { Session } from '@claudetree/shared';
import { SessionCard } from './SessionCard';

interface SessionListProps {
  sessions: Session[];
  onRefresh: () => void;
  onDelete?: (id: string) => void;
}

export function SessionList({ sessions, onRefresh, onDelete }: SessionListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (sessions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-10)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        animation: 'fade-in-up var(--duration-normal) var(--ease-out)',
      }}>
        {/* Illustration */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-5)',
          color: 'var(--text-muted)',
        }}>
          <TreeIllustration />
        </div>

        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          No active sessions
        </h3>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: '320px',
          marginBottom: 'var(--space-5)',
          lineHeight: 1.6,
        }}>
          Start a new session to begin working on issues in parallel with Claude.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--terminal-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
        }}>
          <span style={{ color: 'var(--success)' }}>$</span>
          <span style={{ color: 'var(--text-secondary)' }}>claudetree start</span>
          <span style={{ color: 'var(--accent)' }}>&lt;issue&gt;</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fade-in-up var(--duration-normal) var(--ease-out)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          Sessions
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            padding: '2px 8px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
          }}>
            {sessions.length}
          </span>
        </h2>

        <RefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      }}>
        {sessions.map((session, index) => (
          <div
            key={session.id}
            style={{
              animation: 'fade-in-up var(--duration-normal) var(--ease-out)',
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both',
            }}
          >
            <SessionCard session={session} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RefreshButton({
  onClick,
  isRefreshing,
}: {
  onClick: () => void;
  isRefreshing: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={isRefreshing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: isHovered ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        cursor: isRefreshing ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all var(--duration-fast) var(--ease-out)',
        opacity: isRefreshing ? 0.6 : 1,
      }}
    >
      <span style={{
        display: 'inline-block',
        animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
      }}>
        <RefreshIcon />
      </span>
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function TreeIllustration() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L8 8h8L12 2z" />
      <path d="M12 8v14" />
      <path d="M8 12h8" />
      <path d="M6 16h12" />
      <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="12" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="6" cy="16" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="18" cy="16" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
