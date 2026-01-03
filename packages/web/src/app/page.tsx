'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionList } from '@/components/SessionList';
import { Header } from '@/components/Header';
import type { Session } from '@claudetree/shared';

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [connected, setConnected] = useState(false);
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

  useEffect(() => {
    fetchSessions();

    // WebSocket connection
    const wsUrl = `ws://${window.location.hostname}:3001`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type?.startsWith('session:')) {
        fetchSessions();
      }
    };

    return () => ws.close();
  }, [fetchSessions]);

  return (
    <main style={{ minHeight: '100vh', padding: '24px' }}>
      <Header connected={connected} sessionCount={sessions.length} />

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
