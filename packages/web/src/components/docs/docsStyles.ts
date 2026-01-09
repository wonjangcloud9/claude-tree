import React from 'react';

export const pageTitle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)',
};

export const sectionTitle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  marginTop: '48px',
  marginBottom: '16px',
  scrollMarginTop: '80px',
};

export const subSectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginTop: '24px',
  marginBottom: '12px',
  color: 'var(--text-primary)',
};

export const paragraph: React.CSSProperties = {
  marginBottom: '16px',
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
};

export const list: React.CSSProperties = {
  marginBottom: '16px',
  paddingLeft: '24px',
  color: 'var(--text-secondary)',
  lineHeight: 1.8,
};

export const inlineCode: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '13px',
  fontFamily: 'monospace',
};

export const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '24px',
  fontSize: '14px',
};

export const tableHeader: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '2px solid var(--border)',
  fontWeight: 600,
};

export const tableCell: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};

export const sectionContainer: React.CSSProperties = {
  marginBottom: '64px',
};

export const featureBox: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '32px',
};

export const diagramBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  fontFamily: 'monospace',
  fontSize: '13px',
  lineHeight: 1.8,
};

export const heroTitle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  marginBottom: '16px',
  lineHeight: 1.2,
};

export const heroSubtitle: React.CSSProperties = {
  fontSize: '18px',
  color: 'var(--text-secondary)',
  marginBottom: '32px',
  lineHeight: 1.7,
};
