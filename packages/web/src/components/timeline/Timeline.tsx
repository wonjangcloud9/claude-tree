'use client';

import type { SessionEvent } from '@claudetree/shared';
import { TimelineEvent } from './TimelineEvent';

interface TimelineProps {
  events: SessionEvent[];
  loading?: boolean;
}

export function Timeline({ events, loading }: TimelineProps) {
  if (loading) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
        Loading events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
        No events yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {events.map((event) => (
        <TimelineEvent key={event.id} event={event} />
      ))}
    </div>
  );
}
