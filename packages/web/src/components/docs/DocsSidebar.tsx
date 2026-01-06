'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '#getting-started',
    items: [
      { title: 'Introduction', href: '#introduction' },
      { title: 'Installation', href: '#installation' },
      { title: 'Quick Start', href: '#quick-start' },
    ],
  },
  {
    title: 'CLI Reference',
    href: '#cli-reference',
    items: [
      { title: 'ct init', href: '#ct-init' },
      { title: 'ct start', href: '#ct-start' },
      { title: 'ct batch', href: '#ct-batch' },
      { title: 'ct resume', href: '#ct-resume' },
      { title: 'ct status', href: '#ct-status' },
      { title: 'ct list', href: '#ct-list' },
      { title: 'ct stop', href: '#ct-stop' },
      { title: 'ct web', href: '#ct-web' },
    ],
  },
  {
    title: 'Configuration',
    href: '#configuration',
    items: [
      { title: 'config.json', href: '#config-json' },
      { title: 'GitHub Integration', href: '#github-integration' },
      { title: 'Slack Notifications', href: '#slack-notifications' },
    ],
  },
  {
    title: 'Session Templates',
    href: '#session-templates',
    items: [
      { title: 'Built-in Templates', href: '#built-in-templates' },
      { title: 'Custom Templates', href: '#custom-templates' },
      { title: 'Template Schema', href: '#template-schema' },
    ],
  },
  {
    title: 'Architecture',
    href: '#architecture',
    items: [
      { title: 'Project Structure', href: '#project-structure' },
      { title: 'Package Overview', href: '#package-overview' },
      { title: 'Data Flow', href: '#data-flow' },
    ],
  },
  {
    title: 'API Reference',
    href: '#api-reference',
    items: [
      { title: 'REST Endpoints', href: '#rest-endpoints' },
      { title: 'WebSocket Events', href: '#websocket-events' },
      { title: 'TypeScript Types', href: '#typescript-types' },
    ],
  },
  {
    title: 'Advanced',
    href: '#advanced',
    items: [
      { title: 'Git Worktree Strategy', href: '#git-worktree-strategy' },
      { title: 'Parallel Sessions', href: '#parallel-sessions' },
      { title: 'Error Handling', href: '#error-handling' },
    ],
  },
];

export function DocsSidebar() {
  return (
    <nav
      style={{
        width: '260px',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        position: 'sticky',
        top: '60px',
        padding: '24px 0',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div style={{ paddingRight: '24px' }}>
        {navigation.map((section) => (
          <div key={section.href} style={{ marginBottom: '24px' }}>
            <a
              href={section.href}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '8px',
                textDecoration: 'none',
              }}
            >
              {section.title}
            </a>
            {section.items && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      style={{
                        display: 'block',
                        padding: '6px 0 6px 12px',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        borderLeft: '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderLeftColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
