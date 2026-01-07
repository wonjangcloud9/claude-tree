'use client';

import { useLocale } from 'next-intl';
import type { EventType, SessionEvent } from '@claudetree/shared';
import type { Locale } from '@/i18n/config';
import { formatTime } from '@/lib/datetime';

interface TimelineEventProps {
  event: SessionEvent;
  isFirst?: boolean;
  isLast?: boolean;
}

const EVENT_CONFIG: Record<EventType, {
  color: string;
  bg: string;
  label: string;
}> = {
  output: {
    color: 'var(--text-tertiary)',
    bg: 'var(--bg-tertiary)',
    label: 'Output',
  },
  file_change: {
    color: 'var(--accent)',
    bg: 'var(--accent-glow)',
    label: 'File Change',
  },
  commit: {
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    label: 'Commit',
  },
  test_run: {
    color: 'var(--terminal-purple)',
    bg: 'rgba(192, 132, 252, 0.1)',
    label: 'Test',
  },
  tool_call: {
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    label: 'Tool',
  },
  error: {
    color: 'var(--error)',
    bg: 'var(--error-bg)',
    label: 'Error',
  },
  milestone: {
    color: 'var(--terminal-cyan)',
    bg: 'rgba(34, 211, 238, 0.1)',
    label: 'Milestone',
  },
};

export function TimelineEvent({ event, isFirst, isLast }: TimelineEventProps) {
  const locale = useLocale() as Locale;
  const config = EVENT_CONFIG[event.type];
  const d = typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp;
  const time = formatTime(d, locale);
  const Icon = getIcon(event.type);

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        position: 'relative',
        animation: 'slide-in-left var(--duration-normal) var(--ease-out)',
      }}
    >
      {/* Icon on the timeline */}
      <div style={{
        position: 'absolute',
        left: '-24px',
        top: '12px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: config.bg,
        border: `2px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: config.color,
        zIndex: 1,
      }}>
        <Icon />
      </div>

      {/* Content card */}
      <div
        style={{
          flex: 1,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          transition: 'all var(--duration-fast) var(--ease-out)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: config.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {config.label}
          </span>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {time}
          </span>
        </div>

        {/* Content */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          margin: 0,
          wordBreak: 'break-word',
          lineHeight: 1.5,
        }}>
          {event.content}
        </p>
      </div>
    </div>
  );
}

function getIcon(type: EventType) {
  switch (type) {
    case 'output':
      return OutputIcon;
    case 'file_change':
      return FileIcon;
    case 'commit':
      return GitIcon;
    case 'test_run':
      return TestIcon;
    case 'tool_call':
      return ToolIcon;
    case 'error':
      return ErrorIcon;
    case 'milestone':
      return FlagIcon;
    default:
      return OutputIcon;
  }
}

function OutputIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function GitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
    </svg>
  );
}

function TestIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3h6l-1 7h3l-7 11v-8H7l2-10z" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

