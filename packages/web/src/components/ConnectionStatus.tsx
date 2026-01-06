import type { ConnectionState } from '@/hooks/useWebSocket';

interface ConnectionStatusProps {
  state: ConnectionState;
  retryCount: number;
  lastError: string | null;
  onReconnect: () => void;
}

export function ConnectionStatus({
  state,
  retryCount,
  lastError,
  onReconnect,
}: ConnectionStatusProps) {
  const stateConfig = {
    disconnected: { color: 'var(--error)', label: 'Disconnected' },
    connecting: { color: 'var(--warning)', label: 'Connecting' },
    connected: { color: 'var(--success)', label: 'Connected' },
  };

  const { color, label } = stateConfig[state];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          animation: state === 'connecting' ? 'pulse 1s infinite' : 'none',
        }}
      />
      <span>
        {label}
        {state === 'connecting' && retryCount > 0 && ` (retry ${retryCount})`}
      </span>
      {state === 'disconnected' && lastError && (
        <button
          onClick={onReconnect}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
