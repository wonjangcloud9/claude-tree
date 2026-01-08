'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionList } from '@/components/SessionList';
import { Header } from '@/components/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Session } from '@claudetree/shared';

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete session');
      }
      // Optimistically remove from UI
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, []);

  const wsUrl =
    typeof window !== 'undefined'
      ? `ws://${window.location.hostname}:3001`
      : 'ws://localhost:3001';

  const { connectionState, retryCount, lastError, reconnect } = useWebSocket({
    url: wsUrl,
    onMessage: (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type?.startsWith('session:')) {
        fetchSessions();
      }
    },
  });

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Compute stats
  const stats = {
    total: sessions.length,
    running: sessions.filter(s => s.status === 'running').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    paused: sessions.filter(s => s.status === 'paused').length,
  };

  return (
    <main style={{
      minHeight: '100vh',
      padding: 'var(--space-6)',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <Header
        connectionState={connectionState}
        retryCount={retryCount}
        lastError={lastError}
        onReconnect={reconnect}
        sessionCount={sessions.length}
      />

      {/* Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <StatCard
          label="Total Sessions"
          value={stats.total}
          icon={<GridIcon />}
          color="var(--text-secondary)"
        />
        <StatCard
          label="Running"
          value={stats.running}
          icon={<PlayIcon />}
          color="var(--success)"
          glow={stats.running > 0}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckIcon />}
          color="var(--terminal-cyan)"
        />
        <StatCard
          label="Paused"
          value={stats.paused}
          icon={<PauseIcon />}
          color="var(--warning)"
          glow={stats.paused > 0}
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          background: 'var(--error-bg)',
          color: 'var(--error)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--error)',
          marginBottom: 'var(--space-6)',
          animation: 'fade-in-up var(--duration-normal) var(--ease-out)',
        }}>
          <ErrorIcon />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={fetchSessions}
            style={{
              background: 'var(--error)',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Session List or Loading Skeleton */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <SessionList sessions={sessions} onRefresh={fetchSessions} onDelete={handleDelete} />
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  glow,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  glow?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      transition: 'all var(--duration-fast) var(--ease-out)',
      animation: glow ? 'glow-pulse 2s ease-in-out infinite' : 'none',
      boxShadow: glow ? `0 0 20px ${color}20` : 'none',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: 'var(--radius-md)',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1,
        }}>
          {value}
        </p>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginTop: '4px',
        }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{
          width: '120px',
          height: '24px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
        <div style={{
          width: '80px',
          height: '36px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
      </div>

      {/* Card skeletons */}
      <div style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
              animation: `shimmer 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{
                width: '60%',
                height: '20px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }} />
              <div style={{
                width: '60px',
                height: '20px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-full)',
              }} />
            </div>
            <div style={{
              width: '40%',
              height: '14px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
            }} />
            <div style={{
              height: '4px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)',
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Icons
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
