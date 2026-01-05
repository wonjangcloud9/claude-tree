import Link from 'next/link';
import { ConnectionStatus } from './ConnectionStatus';
import type { ConnectionState } from '@/hooks/useWebSocket';

interface HeaderProps {
  connectionState: ConnectionState;
  retryCount: number;
  lastError: string | null;
  onReconnect: () => void;
  sessionCount: number;
}

export function Header({
  connectionState,
  retryCount,
  lastError,
  onReconnect,
  sessionCount,
}: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>claudetree</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </p>
        </div>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link
            href="/docs"
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              transition: 'all 0.15s',
            }}
          >
            Documentation
          </Link>
        </nav>
      </div>

      <ConnectionStatus
        state={connectionState}
        retryCount={retryCount}
        lastError={lastError}
        onReconnect={onReconnect}
      />
    </header>
  );
}
