'use client';

import type { SessionEvent } from '@claudetree/shared';
import { TimelineEvent } from './TimelineEvent';

interface TimelineProps {
  events: SessionEvent[];
  loading?: boolean;
}

export function Timeline({ events, loading }: TimelineProps) {
  // Filter out output events for cleaner timeline
  const filteredEvents = events.filter(e => e.type !== 'output');

  if (loading) {
    return (
      <div style={{
        padding: 'var(--space-5)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        Loading events...
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-6)',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto var(--space-4)',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ClockIcon />
        </div>
        <p style={{ fontSize: '14px' }}>No events yet</p>
        <p style={{ fontSize: '12px', marginTop: 'var(--space-2)' }}>
          Events will appear here as the session progresses
        </p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      paddingLeft: 'var(--space-6)',
    }}>
      {/* Vertical connector line */}
      <div style={{
        position: 'absolute',
        left: '11px',
        top: '20px',
        bottom: '20px',
        width: '2px',
        background: 'var(--border)',
        borderRadius: '1px',
      }} />

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filteredEvents.map((event, index) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isFirst={index === 0}
            isLast={index === filteredEvents.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
