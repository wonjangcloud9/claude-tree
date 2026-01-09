/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArchitectureSection } from './ArchitectureSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('ArchitectureSection', () => {
  it('should render with correct section id', () => {
    render(<ArchitectureSection />);
    expect(document.getElementById('architecture')).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<ArchitectureSection />);
    expect(screen.getByRole('heading', { level: 1, name: /architecture/i })).toBeInTheDocument();
  });

  it('should render project structure section', () => {
    render(<ArchitectureSection />);
    expect(document.getElementById('project-structure')).toBeInTheDocument();
  });

  it('should render package overview section', () => {
    render(<ArchitectureSection />);
    expect(document.getElementById('package-overview')).toBeInTheDocument();
  });

  it('should render all package descriptions', () => {
    render(<ArchitectureSection />);
    expect(screen.getByRole('heading', { name: /@claudetree\/cli/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /@claudetree\/core/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /@claudetree\/shared/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /@claudetree\/web/i })).toBeInTheDocument();
  });

  it('should render data flow section', () => {
    render(<ArchitectureSection />);
    expect(document.getElementById('data-flow')).toBeInTheDocument();
  });

  it('should render data flow section with diagram', () => {
    render(<ArchitectureSection />);
    // Diagram section has a diagramBox container
    const dataFlowSection = document.getElementById('data-flow');
    expect(dataFlowSection).toBeInTheDocument();
    // Check for the actual diagram pre element in the component
    const diagramContainer = dataFlowSection?.parentElement?.querySelector('[style*="monospace"]');
    expect(diagramContainer).toBeInTheDocument();
  });
});
