/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AdvancedSection } from './AdvancedSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('AdvancedSection', () => {
  it('should render with correct section id', () => {
    render(<AdvancedSection />);
    expect(document.getElementById('advanced')).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<AdvancedSection />);
    expect(
      screen.getByRole('heading', { level: 1, name: /advanced topics/i })
    ).toBeInTheDocument();
  });

  it('should render Git worktree strategy section', () => {
    render(<AdvancedSection />);
    expect(document.getElementById('git-worktree-strategy')).toBeInTheDocument();
  });

  it('should render worktree benefits', () => {
    render(<AdvancedSection />);
    expect(screen.getByText(/isolation/i)).toBeInTheDocument();
    expect(screen.getByText(/no conflicts/i)).toBeInTheDocument();
  });

  it('should render parallel sessions section', () => {
    render(<AdvancedSection />);
    expect(document.getElementById('parallel-sessions')).toBeInTheDocument();
  });

  it('should render recommended limits table', () => {
    render(<AdvancedSection />);
    expect(screen.getByText('8 GB')).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(screen.getByText('32 GB+')).toBeInTheDocument();
  });

  it('should render error handling section', () => {
    render(<AdvancedSection />);
    expect(document.getElementById('error-handling')).toBeInTheDocument();
  });

  it('should render common errors', () => {
    render(<AdvancedSection />);
    expect(screen.getByRole('heading', { name: /claude cli not found/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /branch already exists/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /github token invalid/i })).toBeInTheDocument();
  });

  it('should render session recovery guide', () => {
    render(<AdvancedSection />);
    expect(screen.getByRole('heading', { name: /session recovery/i })).toBeInTheDocument();
  });
});
