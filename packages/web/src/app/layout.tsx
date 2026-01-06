// Root layout - delegates to [locale]/layout.tsx
// This file is required for Next.js but the actual layout is in [locale]/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
