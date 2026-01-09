/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GettingStartedSection } from './GettingStartedSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('GettingStartedSection', () => {
  it('should render with correct section id', () => {
    render(<GettingStartedSection />);
    const section = document.getElementById('getting-started');
    expect(section).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<GettingStartedSection />);
    expect(
      screen.getByRole('heading', { level: 1, name: /claudetree documentation/i })
    ).toBeInTheDocument();
  });

  it('should render key features list', () => {
    render(<GettingStartedSection />);
    expect(screen.getByText(/isolated git worktrees/i)).toBeInTheDocument();
    expect(screen.getByText(/parallel session management/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time websocket dashboard/i)).toBeInTheDocument();
  });

  it('should render introduction section', () => {
    render(<GettingStartedSection />);
    const introSection = document.getElementById('introduction');
    expect(introSection).toBeInTheDocument();
  });

  it('should render installation section', () => {
    render(<GettingStartedSection />);
    const installSection = document.getElementById('installation');
    expect(installSection).toBeInTheDocument();
    expect(screen.getByText(/npm install -g @claudetree\/cli/)).toBeInTheDocument();
  });

  it('should render quick start section', () => {
    render(<GettingStartedSection />);
    const quickStartSection = document.getElementById('quick-start');
    expect(quickStartSection).toBeInTheDocument();
  });

  it('should render architecture diagram', () => {
    render(<GettingStartedSection />);
    expect(screen.getByText(/main repository/i)).toBeInTheDocument();
  });

  it('should render code blocks for installation commands', () => {
    render(<GettingStartedSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });
});
