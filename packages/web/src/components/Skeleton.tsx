'use client';

import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary, #3a3a3a) 50%, var(--bg-secondary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="14px"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = '200px' }: { height?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '16px',
        height,
      }}
    >
      <Skeleton width="40%" height="20px" style={{ marginBottom: '16px' }} />
      <SkeletonText lines={4} />
    </div>
  );
}
