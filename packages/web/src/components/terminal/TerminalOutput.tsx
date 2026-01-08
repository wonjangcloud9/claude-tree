'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { SessionEvent } from '@claudetree/shared';
import type { Locale } from '@/i18n/config';
import { formatTimeWithSeconds } from '@/lib/datetime';

interface TerminalOutputProps {
  events: SessionEvent[];
  maxLines?: number;
  sessionId?: string;
}

export function TerminalOutput({ events, maxLines = 100, sessionId }: TerminalOutputProps) {
  const locale = useLocale() as Locale;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventCountRef = useRef(0);

  const outputEvents = events
    .filter((e) => e.type === 'output' || e.type === 'tool_call' || e.type === 'error')
    .slice(-maxLines);

  // Track new events for animation
  useEffect(() => {
    if (outputEvents.length > prevEventCountRef.current) {
      const newIds = new Set<string>();
      outputEvents.slice(prevEventCountRef.current).forEach((e) => newIds.add(e.id));
      setNewEventIds(newIds);
      // Clear "new" status after animation
      const timer = setTimeout(() => setNewEventIds(new Set()), 1500);
      return () => clearTimeout(timer);
    }
    prevEventCountRef.current = outputEvents.length;
  }, [outputEvents]);

  useEffect(() => {
    if (containerRef.current && isAtBottom) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputEvents.length, isAtBottom]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  const copyAll = async () => {
    const text = outputEvents.map(e => e.content).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--terminal-bg)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      {/* Terminal Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--terminal-header)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Traffic Lights */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ff5f57',
            }} />
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#febc2e',
            }} />
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#28c840',
            }} />
          </div>
          <span style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginLeft: '12px',
          }}>
            Terminal {sessionId ? `- ${sessionId.slice(0, 8)}` : ''}
          </span>
        </div>

        {/* Actions */}
        <button
          onClick={copyAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: copied ? 'var(--success-bg)' : 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: copied ? 'var(--success)' : 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all var(--duration-fast) var(--ease-out)',
          }}
        >
          {copied ? (
            <>
              <CheckIcon />
              Copied
            </>
          ) : (
            <>
              <CopyIcon />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Terminal Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          padding: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          maxHeight: '400px',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {outputEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              background: 'var(--text-muted)',
              animation: 'cursor-blink 1s step-end infinite',
            }} />
            Waiting for output...
          </div>
        ) : (
          <>
            {outputEvents.map((event, index) => (
              <TerminalLine
                key={event.id}
                event={event}
                lineNumber={index + 1}
                locale={locale}
                isNew={newEventIds.has(event.id)}
              />
            ))}
            {/* Blinking cursor at the end */}
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              background: 'var(--terminal-green)',
              animation: 'cursor-blink 1s step-end infinite',
              marginLeft: '4px',
              verticalAlign: 'middle',
            }} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && outputEvents.length > 0 && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all var(--duration-fast) var(--ease-out)',
          }}
        >
          <DownArrowIcon />
          Scroll to bottom
        </button>
      )}
    </div>
  );
}

function TerminalLine({
  event,
  lineNumber,
  locale,
  isNew,
}: {
  event: SessionEvent;
  lineNumber: number;
  locale: Locale;
  isNew?: boolean;
}) {
  const getLineStyle = () => {
    if (event.type === 'error') {
      return {
        color: 'var(--terminal-red)',
        background: 'var(--error-bg)',
        padding: '2px 8px',
        margin: '2px -8px',
        borderRadius: 'var(--radius-sm)',
      };
    }
    if (event.type === 'tool_call') {
      return { color: 'var(--terminal-amber)' };
    }
    return { color: 'var(--text-primary)' };
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '4px',
        animation: isNew ? 'typing-appear 0.3s ease-out' : 'fade-in var(--duration-fast) var(--ease-out)',
        background: isNew ? 'rgba(34, 197, 94, 0.1)' : undefined,
        borderLeft: isNew ? '2px solid var(--terminal-green)' : undefined,
        paddingLeft: isNew ? '8px' : undefined,
        marginLeft: isNew ? '-10px' : undefined,
        transition: 'background 0.5s ease-out, border-left 0.5s ease-out',
        ...getLineStyle(),
      }}
    >
      {/* Line number */}
      <span style={{
        color: 'var(--text-muted)',
        userSelect: 'none',
        minWidth: '32px',
        textAlign: 'right',
        fontSize: '12px',
      }}>
        {lineNumber}
      </span>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Timestamp */}
        <span style={{
          color: 'var(--text-muted)',
          marginRight: '12px',
          fontSize: '11px',
        }}>
          {formatTerminalTime(event.timestamp, locale)}
        </span>

        {/* Prefix for tool calls */}
        {event.type === 'tool_call' && (
          <span style={{ color: 'var(--terminal-purple)', marginRight: '4px' }}>$</span>
        )}

        {/* Error prefix */}
        {event.type === 'error' && (
          <span style={{ color: 'var(--terminal-red)', marginRight: '4px' }}>ERROR:</span>
        )}

        {/* Content */}
        <span style={{ wordBreak: 'break-word' }}>{event.content}</span>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function formatTerminalTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatTimeWithSeconds(d, locale);
}
