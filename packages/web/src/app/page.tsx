'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionList } from '@/components/SessionList';
import { Header } from '@/components/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Session } from '@claudetree/shared';

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
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

  return (
    <main style={{ minHeight: '100vh', padding: '24px' }}>
      <Header
        connectionState={connectionState}
        retryCount={retryCount}
        lastError={lastError}
        onReconnect={reconnect}
        sessionCount={sessions.length}
      />

      {error && (
        <div style={{
          background: 'var(--error)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      <SessionList sessions={sessions} onRefresh={fetchSessions} />
    </main>
  );
}
