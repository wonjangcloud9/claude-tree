import Link from 'next/link';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-primary)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link
            href="/"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            claudetree
          </Link>
          <nav style={{ display: 'flex', gap: '16px' }}>
            <Link
              href="/"
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/docs"
              style={{
                fontSize: '14px',
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              Documentation
            </Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a
            href="https://github.com/claudetree/claudetree"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
          <span
            style={{
              padding: '4px 8px',
              background: 'var(--bg-secondary)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            v0.1.0
          </span>
        </div>
      </header>

      {/* Content */}
      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto' }}>
        <DocsSidebar />
        <main
          style={{
            flex: 1,
            padding: '32px 48px',
            maxWidth: '900px',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
