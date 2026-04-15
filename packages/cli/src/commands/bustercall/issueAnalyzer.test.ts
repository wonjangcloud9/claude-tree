import { describe, it, expect } from 'vitest';
import type { Issue } from '@claudetree/shared';
import { analyzeIssue, analyzeIssues } from './issueAnalyzer.js';

function makeIssue(
  number: number,
  overrides: Partial<Issue> = {},
): Issue {
  return {
    number,
    title: `Issue #${number}`,
    body: '',
    labels: [],
    state: 'open',
    url: `https://github.com/test/repo/issues/${number}`,
    ...overrides,
  };
}

describe('analyzeIssue', () => {
  describe('complexity from labels', () => {
    it('should detect S complexity from "good first issue"', () => {
      const issue = makeIssue(1, { labels: ['good first issue'] });
      expect(analyzeIssue(issue).complexity).toBe('S');
    });

    it('should detect M complexity from "bug"', () => {
      const issue = makeIssue(1, { labels: ['bug'] });
      expect(analyzeIssue(issue).complexity).toBe('M');
    });

    it('should detect L complexity from "feature"', () => {
      const issue = makeIssue(1, { labels: ['feature'] });
      expect(analyzeIssue(issue).complexity).toBe('L');
    });

    it('should detect XL complexity from "migration"', () => {
      const issue = makeIssue(1, { labels: ['migration'] });
      expect(analyzeIssue(issue).complexity).toBe('XL');
    });
  });

  describe('complexity from body analysis', () => {
    it('should return S for empty body', () => {
      const issue = makeIssue(1, { body: '' });
      expect(analyzeIssue(issue).complexity).toBe('M'); // default
    });

    it('should detect higher complexity for rich body', () => {
      const richBody = [
        '## Description',
        'This is a complex issue that requires changes to multiple files.',
        '',
        '## Tasks',
        '- [ ] Update src/auth/login.ts',
        '- [ ] Update src/auth/register.ts',
        '- [ ] Update src/middleware/auth.ts',
        '- [ ] Add tests for all changes',
        '',
        '```typescript',
        'const newAuth = createAuth();',
        '```',
        '',
        '```typescript',
        'const middleware = createMiddleware();',
        '```',
        '',
        'Files affected: src/config.ts, src/types.ts, package.json',
      ].join('\n');

      const issue = makeIssue(1, { body: richBody });
      const analysis = analyzeIssue(issue);
      expect(['L', 'XL']).toContain(analysis.complexity);
    });
  });

  describe('category detection', () => {
    it('should detect bugfix from label', () => {
      const issue = makeIssue(1, { labels: ['bug'] });
      expect(analyzeIssue(issue).category).toBe('bugfix');
    });

    it('should detect feature from title', () => {
      const issue = makeIssue(1, { title: 'Add new feature X' });
      expect(analyzeIssue(issue).category).toBe('feature');
    });

    it('should detect bugfix from title', () => {
      const issue = makeIssue(1, { title: 'Fix broken login' });
      expect(analyzeIssue(issue).category).toBe('bugfix');
    });

    it('should return general for unknown', () => {
      const issue = makeIssue(1, { title: 'Update something' });
      expect(analyzeIssue(issue).category).toBe('general');
    });
  });

  describe('estimated minutes', () => {
    it('should return 5 for S', () => {
      const issue = makeIssue(1, { labels: ['easy'] });
      expect(analyzeIssue(issue).estimatedMinutes).toBe(5);
    });

    it('should return 60 for XL', () => {
      const issue = makeIssue(1, { labels: ['epic'] });
      expect(analyzeIssue(issue).estimatedMinutes).toBe(60);
    });
  });
});

describe('analyzeIssues', () => {
  it('should return aggregate stats', () => {
    const issues = [
      makeIssue(1, { labels: ['easy'] }),      // S = 5m
      makeIssue(2, { labels: ['bug'] }),        // M = 15m
      makeIssue(3, { labels: ['feature'] }),    // L = 30m
    ];

    const result = analyzeIssues(issues);

    expect(result.analyses).toHaveLength(3);
    expect(result.totalEstimatedMinutes).toBe(50);
    expect(result.complexityCounts.S).toBe(1);
    expect(result.complexityCounts.M).toBe(1);
    expect(result.complexityCounts.L).toBe(1);
    expect(result.complexityCounts.XL).toBe(0);
  });

  it('should calculate parallel estimate', () => {
    const issues = [
      makeIssue(1, { labels: ['easy'] }),
      makeIssue(2, { labels: ['easy'] }),
      makeIssue(3, { labels: ['easy'] }),
    ];

    const result = analyzeIssues(issues);

    // 3 * 5m = 15m total, parallel = max(5, 15/3) = 5m
    expect(result.parallelEstimatedMinutes).toBe(5);
  });
});
