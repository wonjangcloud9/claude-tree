'use client';

export function DocsFooter() {
  return (
    <footer
      style={{
        marginTop: '64px',
        paddingTop: '32px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        fontSize: '14px',
      }}
    >
      <p>
        claudetree is open source software. Contributions welcome on{' '}
        <a href="https://github.com/claudetree/claudetree" target="_blank" rel="noopener">
          GitHub
        </a>
        .
      </p>
    </footer>
  );
}
