'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Session, SessionStatus } from '@claudetree/shared';

interface SessionCardProps {
  session: Session;
  index?: number;
}

const STATUS_CONFIG: Record<SessionStatus, {
  bg: string;
  color: string;
  glow: string;
  icon: string;
  animation?: string;
}> = {
  pending: {
    bg: 'var(--warning-bg)',
    color: 'var(--warning)',
    glow: 'var(--warning-glow)',
    icon: '...',
    animation: 'warning-pulse',
  },
  running: {
    bg: 'var(--success-bg)',
    color: 'var(--success)',
    glow: 'var(--success-glow)',
    icon: '',
    animation: 'glow-pulse',
  },
  paused: {
    bg: 'var(--info-glow)',
    color: 'var(--info)',
    glow: 'var(--info-glow)',
    icon: '',
  },
  completed: {
    bg: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.15)',
    icon: '',
  },
  failed: {
    bg: 'var(--error-bg)',
    color: 'var(--error)',
    glow: 'var(--error-glow)',
    icon: '',
  },
};

export function SessionCard({ session, index = 0 }: SessionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = STATUS_CONFIG[session.status];
  const shortId = session.id.slice(0, 8);
  const isActive = session.status === 'running' || session.status === 'pending';

  return (
    <Link
      href={`/sessions/${session.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        background: isHovered
          ? 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)'
          : 'var(--bg-secondary)',
        border: `1px solid ${isHovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all var(--duration-normal) var(--ease-out)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isActive && config.animation
          ? `0 0 20px 2px ${config.glow}`
          : isHovered
            ? '0 8px 30px rgba(0, 0, 0, 0.3)'
            : 'none',
        animation: isActive && config.animation ? `${config.animation} 2s ease-in-out infinite` : 'none',
        animationDelay: `${index * 100}ms`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Hover gradient overlay */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--gradient-card-hover)',
            pointerEvents: 'none',
            borderRadius: 'var(--radius-lg)',
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-4)',
        }}>
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: 'var(--space-1)',
              color: 'var(--text-primary)',
            }}>
              {session.issueNumber ? `Issue #${session.issueNumber}` : `Session ${shortId}`}
            </h3>
            <code style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-tertiary)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}>
              {shortId}
            </code>
          </div>

          {/* Status Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: config.bg,
            color: config.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: config.color,
              animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            {session.status}
          </span>
        </div>

        {/* Prompt */}
        {session.prompt && (
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
          }}>
            {session.prompt}
          </p>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ClockIcon />
            {formatDate(session.createdAt)}
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: isHovered ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color var(--duration-fast) var(--ease-out)',
          }}>
            View
            <ArrowIcon rotated={isHovered} />
          </span>
        </div>

        {/* Progress bar for running sessions */}
        {session.status === 'running' && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'var(--bg-tertiary)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '30%',
              height: '100%',
              background: 'var(--gradient-running)',
              animation: 'shimmer 2s infinite',
            }} />
          </div>
        )}
      </div>
    </Link>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ArrowIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transition: 'transform var(--duration-fast) var(--ease-out)',
        transform: rotated ? 'translateX(3px)' : 'translateX(0)',
      }}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
