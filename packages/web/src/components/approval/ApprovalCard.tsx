'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import type { ApprovalStatus, ToolApproval } from '@claudetree/shared';
import type { Locale } from '@/i18n/config';
import { formatTime } from '@/lib/datetime';

interface ApprovalCardProps {
  approval: ToolApproval;
  onApprove?: () => void;
  onReject?: () => void;
}

const STATUS_CONFIG: Record<ApprovalStatus, {
  bg: string;
  color: string;
  glow: string;
  label: string;
}> = {
  pending: {
    bg: 'var(--warning-bg)',
    color: 'var(--warning)',
    glow: 'var(--warning-glow)',
    label: 'Pending',
  },
  approved: {
    bg: 'var(--success-bg)',
    color: 'var(--success)',
    glow: 'var(--success-glow)',
    label: 'Approved',
  },
  rejected: {
    bg: 'var(--error-bg)',
    color: 'var(--error)',
    glow: 'var(--error-glow)',
    label: 'Rejected',
  },
};

const TOOL_ICONS: Record<string, () => React.ReactElement> = {
  Bash: TerminalIcon,
  Read: FileIcon,
  Write: EditIcon,
  Edit: EditIcon,
  Glob: SearchIcon,
  Grep: SearchIcon,
  default: ToolIcon,
};

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const locale = useLocale() as Locale;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const config = STATUS_CONFIG[approval.status];
  const isPending = approval.status === 'pending';
  const Icon = TOOL_ICONS[approval.toolName] || TOOL_ICONS.default;

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsLoading(true);
    await onApprove();
    setIsLoading(false);
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsLoading(true);
    await onReject();
    setIsLoading(false);
  };

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${isPending ? config.color : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        animation: isPending ? 'warning-pulse 2s ease-in-out infinite' : 'none',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Tool Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: config.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
          }}>
            <Icon />
          </div>
          <div>
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--text-primary)',
            }}>
              {approval.toolName}
            </span>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}>
              {formatApprovalTime(approval.requestedAt, locale)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: config.bg,
          color: config.color,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {isPending && (
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: config.color,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
          {config.label}
        </span>
      </div>

      {/* Parameters */}
      <div style={{ marginBottom: isPending ? 'var(--space-3)' : 0 }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            marginBottom: isExpanded ? 'var(--space-2)' : 0,
          }}
        >
          <ChevronIcon rotated={isExpanded} />
          {isExpanded ? 'Hide' : 'Show'} parameters
        </button>

        {isExpanded && (
          <pre style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-tertiary)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            overflow: 'auto',
            maxHeight: '150px',
            margin: 0,
            color: 'var(--text-secondary)',
            animation: 'fade-in var(--duration-fast) var(--ease-out)',
          }}>
            {JSON.stringify(approval.parameters, null, 2)}
          </pre>
        )}
      </div>

      {/* Actions */}
      {isPending && onApprove && onReject && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <ActionButton
            onClick={handleApprove}
            disabled={isLoading}
            variant="approve"
          >
            <CheckIcon />
            Approve
          </ActionButton>
          <ActionButton
            onClick={handleReject}
            disabled={isLoading}
            variant="reject"
          >
            <XIcon />
            Reject
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: 'approve' | 'reject';
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isApprove = variant === 'approve';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px var(--space-4)',
        background: isApprove
          ? isHovered ? 'var(--success)' : 'var(--success-bg)'
          : isHovered ? 'var(--error)' : 'var(--error-bg)',
        color: isApprove
          ? isHovered ? 'white' : 'var(--success)'
          : isHovered ? 'white' : 'var(--error)',
        border: `1px solid ${isApprove ? 'var(--success)' : 'var(--error)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all var(--duration-fast) var(--ease-out)',
        transform: isHovered && !disabled ? 'translateY(-1px)' : 'translateY(0)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transition: 'transform var(--duration-fast) var(--ease-out)',
        transform: rotated ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
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

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function formatApprovalTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatTime(d, locale);
}
