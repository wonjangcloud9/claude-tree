'use client';

import type { EventType, SessionEvent } from '@claudetree/shared';

interface TimelineEventProps {
  event: SessionEvent;
}

const EVENT_ICONS: Record<EventType, string> = {
  output: '📝',
  file_change: '📄',
  commit: '📦',
  test_run: '🧪',
  tool_call: '🔧',
  error: '❌',
  milestone: '🎯',
};

const EVENT_COLORS: Record<EventType, string> = {
  output: '#6b7280',
  file_change: '#3b82f6',
  commit: '#22c55e',
  test_run: '#a855f7',
  tool_call: '#f59e0b',
  error: '#ef4444',
  milestone: '#06b6d4',
};

export function TimelineEvent({ event }: TimelineEventProps) {
  const icon = EVENT_ICONS[event.type];
  const color = EVENT_COLORS[event.type];
  const time = formatTime(event.timestamp);

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color,
              textTransform: 'uppercase',
            }}
          >
            {event.type.replace('_', ' ')}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {time}
          </span>
        </div>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-primary)',
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {event.content}
        </p>
      </div>
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
}
