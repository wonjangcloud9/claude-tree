'use client';

import { useState } from 'react';
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
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const isConnected = connectionState === 'connected';

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-8)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--gradient-header)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        borderBottomColor: isConnected ? 'var(--success-glow)' : 'var(--border)',
        boxShadow: isConnected ? '0 4px 20px rgba(74, 222, 128, 0.1)' : 'none',
        transition: 'all var(--duration-slow) var(--ease-out)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow when connected */}
      {isConnected && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--success), transparent)',
            animation: 'shimmer 3s infinite',
          }}
        />
      )}

      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
        {/* Logo */}
        <Link
          href="/"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            transition: 'all var(--duration-fast) var(--ease-out)',
            transform: isLogoHovered ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          {/* Logo Icon */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isLogoHovered ? '0 0 20px var(--accent-glow)' : 'none',
            transition: 'box-shadow var(--duration-fast) var(--ease-out)',
          }}>
            <TreeIcon />
          </div>

          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
            }}>
              claudetree
            </h1>
            <p style={{
              color: 'var(--text-tertiary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <NavLink href="/" label="Dashboard" />
          <NavLink href="/docs" label="Docs" />
        </nav>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Live Badge */}
        {isConnected && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--success)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            Live
          </span>
        )}

        <ConnectionStatus
          state={connectionState}
          retryCount={retryCount}
          lastError={lastError}
          onReconnect={onReconnect}
        />
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        fontSize: '14px',
        color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        textDecoration: 'none',
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
    >
      {label}
      {/* Underline animation */}
      <span style={{
        position: 'absolute',
        bottom: '6px',
        left: '14px',
        right: '14px',
        height: '2px',
        background: 'var(--accent)',
        borderRadius: '1px',
        transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left',
        transition: 'transform var(--duration-fast) var(--ease-out)',
      }} />
    </Link>
  );
}

function TreeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M12 2L8 8h8L12 2z" />
      <path d="M12 8v14" />
      <path d="M8 12h8" />
      <path d="M6 16h12" />
    </svg>
  );
}
