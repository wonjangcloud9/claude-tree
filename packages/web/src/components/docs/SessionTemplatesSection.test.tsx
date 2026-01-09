/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SessionTemplatesSection } from './SessionTemplatesSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('SessionTemplatesSection', () => {
  it('should render with correct section id', () => {
    render(<SessionTemplatesSection />);
    expect(document.getElementById('session-templates')).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<SessionTemplatesSection />);
    expect(
      screen.getByRole('heading', { level: 1, name: /session templates/i })
    ).toBeInTheDocument();
  });

  it('should render built-in templates section', () => {
    render(<SessionTemplatesSection />);
    expect(document.getElementById('built-in-templates')).toBeInTheDocument();
  });

  it('should render all built-in template types', () => {
    render(<SessionTemplatesSection />);
    expect(screen.getByRole('heading', { name: /^bugfix$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^feature$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^refactor$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^review$/i })).toBeInTheDocument();
  });

  it('should render custom templates section', () => {
    render(<SessionTemplatesSection />);
    expect(document.getElementById('custom-templates')).toBeInTheDocument();
  });

  it('should render template schema section', () => {
    render(<SessionTemplatesSection />);
    expect(document.getElementById('template-schema')).toBeInTheDocument();
  });

  it('should render code blocks for template examples', () => {
    render(<SessionTemplatesSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });
});
