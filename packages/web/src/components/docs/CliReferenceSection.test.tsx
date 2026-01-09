/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CliReferenceSection } from './CliReferenceSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('CliReferenceSection', () => {
  it('should render with correct section id', () => {
    render(<CliReferenceSection />);
    const section = document.getElementById('cli-reference');
    expect(section).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<CliReferenceSection />);
    expect(screen.getByRole('heading', { level: 1, name: /cli reference/i })).toBeInTheDocument();
  });

  it('should render ct init command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-init')).toBeInTheDocument();
    expect(screen.getByText(/initialize claudetree/i)).toBeInTheDocument();
  });

  it('should render ct start command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-start')).toBeInTheDocument();
    expect(screen.getByText(/create a worktree and start/i)).toBeInTheDocument();
  });

  it('should render ct batch command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-batch')).toBeInTheDocument();
  });

  it('should render ct bustercall command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-bustercall')).toBeInTheDocument();
  });

  it('should render ct clean command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-clean')).toBeInTheDocument();
  });

  it('should render ct resume command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-resume')).toBeInTheDocument();
  });

  it('should render ct status command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-status')).toBeInTheDocument();
  });

  it('should render ct list command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-list')).toBeInTheDocument();
  });

  it('should render ct stop command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-stop')).toBeInTheDocument();
  });

  it('should render ct web command section', () => {
    render(<CliReferenceSection />);
    expect(document.getElementById('ct-web')).toBeInTheDocument();
  });

  it('should render TDD mode documentation', () => {
    render(<CliReferenceSection />);
    expect(screen.getByRole('heading', { name: /tdd mode/i })).toBeInTheDocument();
  });

  it('should render multiple code blocks for examples', () => {
    render(<CliReferenceSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    expect(codeBlocks.length).toBeGreaterThan(5);
  });
});
