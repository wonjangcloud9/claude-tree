/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ConfigurationSection } from './ConfigurationSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('ConfigurationSection', () => {
  it('should render with correct section id', () => {
    render(<ConfigurationSection />);
    const section = document.getElementById('configuration');
    expect(section).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<ConfigurationSection />);
    expect(screen.getByRole('heading', { level: 1, name: /configuration/i })).toBeInTheDocument();
  });

  it('should render config.json section', () => {
    render(<ConfigurationSection />);
    expect(document.getElementById('config-json')).toBeInTheDocument();
  });

  it('should render configuration options table', () => {
    render(<ConfigurationSection />);
    expect(screen.getByText('worktreeDir')).toBeInTheDocument();
    expect(screen.getByText('github.owner')).toBeInTheDocument();
  });

  it('should render GitHub integration section', () => {
    render(<ConfigurationSection />);
    expect(document.getElementById('github-integration')).toBeInTheDocument();
  });

  it('should render Slack notifications section', () => {
    render(<ConfigurationSection />);
    expect(document.getElementById('slack-notifications')).toBeInTheDocument();
  });

  it('should render notification types table', () => {
    render(<ConfigurationSection />);
    expect(screen.getByText(/session started/i)).toBeInTheDocument();
    expect(screen.getByText(/session completed/i)).toBeInTheDocument();
  });

  it('should render code blocks for configuration examples', () => {
    render(<ConfigurationSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });
});
