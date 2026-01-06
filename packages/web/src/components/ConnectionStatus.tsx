'use client';

import { useState } from 'react';
import type { ConnectionState } from '@/hooks/useWebSocket';

interface ConnectionStatusProps {
  state: ConnectionState;
  retryCount: number;
  lastError: string | null;
  onReconnect: () => void;
}

const STATE_CONFIG = {
  disconnected: {
    color: 'var(--error)',
    glow: 'var(--error-glow)',
    label: 'Disconnected',
    animation: 'error-pulse',
  },
  connecting: {
    color: 'var(--warning)',
    glow: 'var(--warning-glow)',
    label: 'Connecting',
    animation: 'none',
  },
  connected: {
    color: 'var(--success)',
    glow: 'var(--success-glow)',
    label: 'Connected',
    animation: 'pulse',
  },
};

export function ConnectionStatus({
  state,
  retryCount,
  lastError,
  onReconnect,
}: ConnectionStatusProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const config = STATE_CONFIG[state];

  const handleRetry = async () => {
    setIsRetrying(true);
    onReconnect();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Indicator */}
      <div style={{ position: 'relative' }}>
        {/* Glow ring for connecting state */}
        {state === 'connecting' && (
          <span
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              border: `2px solid ${config.color}`,
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}

        {/* Main dot */}
        <span
          style={{
            display: 'block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: config.color,
            boxShadow: state !== 'connecting' ? `0 0 8px ${config.glow}` : 'none',
            animation: config.animation !== 'none' ? `${config.animation} 2s ease-in-out infinite` : 'none',
          }}
        />
      </div>

      {/* Label */}
      <span style={{ fontWeight: 500 }}>
        {config.label}
        {state === 'connecting' && retryCount > 0 && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            {' '}(retry {retryCount})
          </span>
        )}
      </span>

      {/* Retry Button */}
      {state === 'disconnected' && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            background: isRetrying ? 'var(--bg-tertiary)' : 'var(--error-bg)',
            border: `1px solid ${isRetrying ? 'var(--border)' : 'var(--error)'}`,
            borderRadius: 'var(--radius-sm)',
            cursor: isRetrying ? 'not-allowed' : 'pointer',
            color: isRetrying ? 'var(--text-muted)' : 'var(--error)',
            transition: 'all var(--duration-fast) var(--ease-out)',
            transform: isRetrying ? 'none' : 'translateY(0)',
          }}
        >
          {isRetrying ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                <RefreshIcon />
              </span>
              Retrying...
            </>
          ) : (
            <>
              <RefreshIcon />
              Retry
            </>
          )}
        </button>
      )}

      {/* Tooltip */}
      {isHovered && lastError && state === 'disconnected' && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            animation: 'fade-in var(--duration-fast) var(--ease-out)',
          }}
        >
          <span style={{ color: 'var(--error)' }}>Error: </span>
          {lastError}
        </div>
      )}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
