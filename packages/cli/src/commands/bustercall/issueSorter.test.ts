import { describe, it, expect } from 'vitest';
import type { Issue } from '@claudetree/shared';
import { sortIssues, PRIORITY_LABELS } from './issueSorter.js';

function makeIssue(number: number, labels: string[] = []): Issue {
  return {
    number,
    title: `Issue #${number}`,
    body: '',
    labels,
    state: 'open',
    url: `https://github.com/test/repo/issues/${number}`,
  };
}

describe('sortIssues', () => {
  describe('priority sorting', () => {
    it('should sort by priority labels (highest first)', () => {
      const issues = [
        makeIssue(1, ['low']),
        makeIssue(2, ['critical']),
        makeIssue(3, ['medium']),
        makeIssue(4, ['p1']),
      ];

      const sorted = sortIssues(issues, 'priority');

      expect(sorted.map((i) => i.number)).toEqual([2, 4, 3, 1]);
    });

    it('should put unlabeled issues last', () => {
      const issues = [
        makeIssue(1),
        makeIssue(2, ['urgent']),
        makeIssue(3),
      ];

      const sorted = sortIssues(issues, 'priority');

      expect(sorted[0]!.number).toBe(2);
    });

    it('should handle issues with multiple labels', () => {
      const issues = [
        makeIssue(1, ['bug', 'low']),
        makeIssue(2, ['feature', 'critical']),
      ];

      const sorted = sortIssues(issues, 'priority');

      expect(sorted[0]!.number).toBe(2);
    });
  });

  describe('newest sorting', () => {
    it('should sort by issue number descending', () => {
      const issues = [makeIssue(5), makeIssue(10), makeIssue(1)];

      const sorted = sortIssues(issues, 'newest');

      expect(sorted.map((i) => i.number)).toEqual([10, 5, 1]);
    });
  });

  describe('oldest sorting', () => {
    it('should sort by issue number ascending', () => {
      const issues = [makeIssue(10), makeIssue(1), makeIssue(5)];

      const sorted = sortIssues(issues, 'oldest');

      expect(sorted.map((i) => i.number)).toEqual([1, 5, 10]);
    });
  });

  it('should not mutate the original array', () => {
    const issues = [makeIssue(3), makeIssue(1), makeIssue(2)];
    const original = [...issues];

    sortIssues(issues, 'newest');

    expect(issues.map((i) => i.number)).toEqual(original.map((i) => i.number));
  });
});

describe('PRIORITY_LABELS', () => {
  it('should have critical/p0 as highest priority', () => {
    expect(PRIORITY_LABELS['critical']).toBe(1);
    expect(PRIORITY_LABELS['p0']).toBe(1);
  });

  it('should have low/p4 as lowest priority', () => {
    expect(PRIORITY_LABELS['low']).toBe(7);
    expect(PRIORITY_LABELS['p4']).toBe(7);
  });
});
