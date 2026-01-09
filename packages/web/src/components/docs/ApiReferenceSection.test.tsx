/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ApiReferenceSection } from './ApiReferenceSection';

// Mock CodeBlock component
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('ApiReferenceSection', () => {
  it('should render with correct section id', () => {
    render(<ApiReferenceSection />);
    expect(document.getElementById('api-reference')).toBeInTheDocument();
  });

  it('should render main heading', () => {
    render(<ApiReferenceSection />);
    expect(screen.getByRole('heading', { level: 1, name: /api reference/i })).toBeInTheDocument();
  });

  it('should render REST endpoints section', () => {
    render(<ApiReferenceSection />);
    expect(document.getElementById('rest-endpoints')).toBeInTheDocument();
  });

  it('should render sessions endpoints table', () => {
    render(<ApiReferenceSection />);
    expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
    expect(screen.getAllByText('POST').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/api/sessions').length).toBeGreaterThan(0);
  });

  it('should render WebSocket events section', () => {
    render(<ApiReferenceSection />);
    expect(document.getElementById('websocket-events')).toBeInTheDocument();
  });

  it('should render TypeScript types section', () => {
    render(<ApiReferenceSection />);
    expect(document.getElementById('typescript-types')).toBeInTheDocument();
  });

  it('should render Session interface', () => {
    render(<ApiReferenceSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    const sessionBlock = codeBlocks.find((block) => block.textContent?.includes('interface Session'));
    expect(sessionBlock).toBeTruthy();
  });

  it('should render Event interface', () => {
    render(<ApiReferenceSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    const eventBlock = codeBlocks.find((block) => block.textContent?.includes('interface Event'));
    expect(eventBlock).toBeTruthy();
  });

  it('should render ToolApproval interface', () => {
    render(<ApiReferenceSection />);
    const codeBlocks = screen.getAllByTestId('code-block');
    const approvalBlock = codeBlocks.find((block) =>
      block.textContent?.includes('interface ToolApproval')
    );
    expect(approvalBlock).toBeTruthy();
  });
});
