/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DocsFooter } from './DocsFooter';

describe('DocsFooter', () => {
  it('should render footer element', () => {
    const { container } = render(<DocsFooter />);
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('should render open source message', () => {
    render(<DocsFooter />);
    expect(screen.getByText(/open source software/i)).toBeInTheDocument();
  });

  it('should render GitHub link', () => {
    render(<DocsFooter />);
    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/claudetree/claudetree');
  });

  it('should have external link attributes', () => {
    render(<DocsFooter />);
    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });
});
