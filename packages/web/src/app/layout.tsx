import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'claudetree',
  description: 'Git Worktree-based Claude Code multi-session manager',
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
