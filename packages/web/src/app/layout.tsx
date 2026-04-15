import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://github.com/wonjangcloud9/claude-tree';
const OG_IMAGE = '/api/og';

export const metadata: Metadata = {
  title: {
    default: 'claudetree - Parallel Claude Code Session Manager',
    template: '%s | claudetree',
  },
  description:
    'Issue-to-PR automation with parallel Claude Code sessions, git worktree isolation, cost tracking, conflict detection, and a real-time web dashboard.',
  keywords: [
    'claude code',
    'ai coding',
    'parallel sessions',
    'git worktree',
    'issue to pr',
    'automation',
    'cost tracking',
    'multi agent',
    'cli tool',
    'developer tools',
    'claudetree',
    'bustercall',
  ],
  authors: [{ name: 'wonjangcloud9', url: SITE_URL }],
  creator: 'wonjangcloud9',
  publisher: 'wonjangcloud9',

  // Open Graph - 카카오톡, 페이스북, 링크드인 등
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ko_KR', 'ja_JP', 'zh_CN'],
    url: SITE_URL,
    siteName: 'claudetree',
    title: 'claudetree - Parallel Claude Code Session Manager',
    description:
      'Issue-to-PR automation: run parallel Claude Code sessions with cost tracking, conflict detection, and auto code review.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'claudetree - Parallel Claude Code sessions with cost tracking and web dashboard',
        type: 'image/png',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'claudetree - Parallel Claude Code Session Manager',
    description:
      'Issue-to-PR automation: run parallel Claude Code sessions with cost tracking and conflict detection.',
    images: [OG_IMAGE],
    creator: '@wonjangcloud9',
  },

  // Icons
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },

  // Additional meta
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  metadataBase: new URL('http://localhost:3000'),
  alternates: {
    canonical: SITE_URL,
  },
  category: 'developer tools',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
