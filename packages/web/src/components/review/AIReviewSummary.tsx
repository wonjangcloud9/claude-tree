'use client';

import type { SerializedAIReviewSummary } from '@claudetree/shared';

interface AIReviewSummaryProps {
  review: SerializedAIReviewSummary | null;
}

export function AIReviewSummary({ review }: AIReviewSummaryProps) {
  if (!review) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        border: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <RobotIcon />
        <p style={{ marginTop: 'var(--space-3)' }}>No AI review summary available yet</p>
        <p style={{ fontSize: '12px', marginTop: 'var(--space-2)' }}>
          Generated automatically when session completes
        </p>
      </div>
    );
  }

  const riskColors = {
    low: 'var(--success)',
    medium: 'var(--warning)',
    high: 'var(--error)',
  };

  const severityConfig = {
    critical: { bg: 'var(--error-bg)', color: 'var(--error)', icon: '🔴' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: '🟡' },
    info: { bg: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)', icon: '🔵' },
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          <RobotIcon />
        </div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            AI Code Review
          </h4>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: `${riskColors[review.riskLevel]}15`,
            color: riskColors[review.riskLevel],
            textTransform: 'uppercase',
          }}>
            {review.riskLevel} risk
          </span>
        </div>
      </div>

      {/* Summary */}
      <p style={{
        fontSize: '14px',
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        marginBottom: 'var(--space-4)',
        padding: 'var(--space-3)',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        borderLeft: '3px solid var(--accent)',
      }}>
        {review.summary}
      </p>

      {/* What Changed */}
      {review.whatChanged.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h5 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            What Changed
          </h5>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}>
            {review.whatChanged.map((change, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}>
                <span style={{ color: 'var(--success)' }}>•</span>
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Potential Issues */}
      {review.potentialIssues.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h5 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Potential Issues ({review.potentialIssues.length})
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {review.potentialIssues.map((issue, i) => {
              const config = severityConfig[issue.severity];
              return (
                <div key={i} style={{
                  padding: 'var(--space-3)',
                  background: config.bg,
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${config.color}30`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-1)',
                  }}>
                    <span>{config.icon}</span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: config.color,
                    }}>
                      {issue.title}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}>
                    {issue.description}
                  </p>
                  {issue.file && (
                    <code style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                    }}>
                      {issue.file}{issue.line ? `:${issue.line}` : ''}
                    </code>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {review.suggestions.length > 0 && (
        <div>
          <h5 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Suggestions
          </h5>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}>
            {review.suggestions.map((suggestion, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}>
                <span style={{ color: 'var(--terminal-cyan)' }}>💡</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border)',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        Generated {new Date(review.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function RobotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
