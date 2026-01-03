'use client';

import { useEffect, useRef } from 'react';
import type { SessionEvent } from '@claudetree/shared';

interface TerminalOutputProps {
  events: SessionEvent[];
  maxLines?: number;
}

export function TerminalOutput({ events, maxLines = 100 }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const outputEvents = events
    .filter((e) => e.type === 'output' || e.type === 'tool_call')
    .slice(-maxLines);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputEvents.length]);

  return (
    <div
      ref={containerRef}
      style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#e5e5e5',
        maxHeight: '400px',
        overflowY: 'auto',
      }}
    >
      {outputEvents.length === 0 ? (
        <div style={{ color: '#6b7280' }}>Waiting for output...</div>
      ) : (
        outputEvents.map((event) => (
          <div
            key={event.id}
            style={{
              marginBottom: '4px',
              color: event.type === 'tool_call' ? '#f59e0b' : '#e5e5e5',
            }}
          >
            <span style={{ color: '#6b7280', marginRight: '8px' }}>
              {formatTime(event.timestamp)}
            </span>
            {event.type === 'tool_call' && (
              <span style={{ color: '#a855f7', marginRight: '4px' }}>$</span>
            )}
            {event.content}
          </div>
        ))
      )}
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour12: false });
}
