import { describe, it, expect } from 'vitest';
import {
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  list,
  inlineCode,
  table,
  tableHeader,
  tableCell,
  sectionContainer,
  featureBox,
  diagramBox,
} from './docsStyles';

describe('docsStyles', () => {
  describe('pageTitle', () => {
    it('should have correct font size and weight', () => {
      expect(pageTitle.fontSize).toBe('28px');
      expect(pageTitle.fontWeight).toBe(700);
    });

    it('should have border bottom for visual separation', () => {
      expect(pageTitle.borderBottom).toBe('1px solid var(--border)');
    });
  });

  describe('sectionTitle', () => {
    it('should have correct font size', () => {
      expect(sectionTitle.fontSize).toBe('22px');
      expect(sectionTitle.fontWeight).toBe(600);
    });

    it('should have scroll margin for anchor links', () => {
      expect(sectionTitle.scrollMarginTop).toBe('80px');
    });
  });

  describe('subSectionTitle', () => {
    it('should have smaller font size than sectionTitle', () => {
      expect(subSectionTitle.fontSize).toBe('16px');
      expect(subSectionTitle.fontWeight).toBe(600);
    });
  });

  describe('paragraph', () => {
    it('should have appropriate line height for readability', () => {
      expect(paragraph.lineHeight).toBe(1.7);
    });

    it('should use secondary text color', () => {
      expect(paragraph.color).toBe('var(--text-secondary)');
    });
  });

  describe('list', () => {
    it('should have proper left padding', () => {
      expect(list.paddingLeft).toBe('24px');
    });

    it('should have appropriate line height', () => {
      expect(list.lineHeight).toBe(1.8);
    });
  });

  describe('inlineCode', () => {
    it('should have background and padding', () => {
      expect(inlineCode.background).toBe('var(--bg-tertiary)');
      expect(inlineCode.padding).toBe('2px 6px');
    });

    it('should use monospace font', () => {
      expect(inlineCode.fontFamily).toBe('monospace');
    });
  });

  describe('table styles', () => {
    it('should have full width table', () => {
      expect(table.width).toBe('100%');
      expect(table.borderCollapse).toBe('collapse');
    });

    it('should have proper header styling', () => {
      expect(tableHeader.textAlign).toBe('left');
      expect(tableHeader.fontWeight).toBe(600);
      expect(tableHeader.borderBottom).toBe('2px solid var(--border)');
    });

    it('should have proper cell styling', () => {
      expect(tableCell.padding).toBe('12px');
      expect(tableCell.borderBottom).toBe('1px solid var(--border)');
    });
  });

  describe('sectionContainer', () => {
    it('should have bottom margin for spacing between sections', () => {
      expect(sectionContainer.marginBottom).toBe('64px');
    });
  });

  describe('featureBox', () => {
    it('should have gradient background', () => {
      expect(featureBox.background).toContain('linear-gradient');
    });

    it('should have rounded corners', () => {
      expect(featureBox.borderRadius).toBe('12px');
    });
  });

  describe('diagramBox', () => {
    it('should have monospace font for ASCII diagrams', () => {
      expect(diagramBox.fontFamily).toBe('monospace');
    });

    it('should have proper padding and background', () => {
      expect(diagramBox.background).toBe('var(--bg-secondary)');
      expect(diagramBox.padding).toBe('24px');
    });
  });
});
