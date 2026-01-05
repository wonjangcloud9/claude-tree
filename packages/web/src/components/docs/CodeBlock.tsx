'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = 'bash',
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '16px',
        border: '1px solid var(--border)',
      }}
    >
      {filename && (
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{filename}</span>
          <span
            style={{
              padding: '2px 8px',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}
          >
            {language}
          </span>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 8px',
            background: copied ? 'var(--success)' : 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: copied ? '#fff' : 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre
          style={{
            padding: '16px',
            margin: 0,
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          <code>
            {showLineNumbers
              ? lines.map((line, i) => (
                  <div key={i} style={{ display: 'flex' }}>
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        opacity: 0.5,
                        minWidth: '40px',
                        textAlign: 'right',
                        paddingRight: '16px',
                        userSelect: 'none',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </div>
                ))
              : code}
          </code>
        </pre>
      </div>
    </div>
  );
}
