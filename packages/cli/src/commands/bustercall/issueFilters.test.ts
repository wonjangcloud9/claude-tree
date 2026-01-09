import { describe, it, expect } from 'vitest';
import {
  detectPotentialConflict,
  groupIssuesByConflict,
  DEFAULT_CONFLICT_LABELS,
  CONFLICT_KEYWORDS,
} from './issueFilters.js';
import type { Issue } from '@claudetree/shared';

describe('issueFilters', () => {
  describe('detectPotentialConflict', () => {
    it('should detect conflict by label', () => {
      const issue: Issue = {
        number: 1,
        title: 'Add new feature',
        body: 'Feature description',
        labels: ['dependencies'],
        state: 'open',
        url: 'https://github.com/owner/repo/issues/1',
      };

      const result = detectPotentialConflict(issue, DEFAULT_CONFLICT_LABELS);
      expect(result).toBe(true);
    });

    it('should detect conflict by keyword in title', () => {
      const issue: Issue = {
        number: 2,
        title: 'Update package.json dependencies',
        body: 'Need to update deps',
        labels: ['enhancement'],
        state: 'open',
        url: 'https://github.com/owner/repo/issues/2',
      };

      const result = detectPotentialConflict(issue, DEFAULT_CONFLICT_LABELS);
      expect(result).toBe(true);
    });

    it('should detect Korean conflict keywords', () => {
      const issue: Issue = {
        number: 3,
        title: '설정 파일 업데이트',
        body: 'Config update',
        labels: [],
        state: 'open',
        url: '',
      };

      const result = detectPotentialConflict(issue, DEFAULT_CONFLICT_LABELS);
      expect(result).toBe(true);
    });

    it('should return false for safe issues', () => {
      const issue: Issue = {
        number: 4,
        title: 'Add user profile page',
        body: 'New feature for user profiles',
        labels: ['feature'],
        state: 'open',
        url: '',
      };

      const result = detectPotentialConflict(issue, DEFAULT_CONFLICT_LABELS);
      expect(result).toBe(false);
    });

    it('should handle case insensitive label matching', () => {
      const issue: Issue = {
        number: 5,
        title: 'Some task',
        body: '',
        labels: ['INFRASTRUCTURE'],
        state: 'open',
        url: '',
      };

      const result = detectPotentialConflict(issue, DEFAULT_CONFLICT_LABELS);
      expect(result).toBe(true);
    });
  });

  describe('groupIssuesByConflict', () => {
    it('should separate conflicting and safe issues', () => {
      const issues: Issue[] = [
        {
          number: 1,
          title: 'Update tsconfig',
          body: '',
          labels: [],
          state: 'open',
          url: '',
        },
        {
          number: 2,
          title: 'Add login page',
          body: '',
          labels: [],
          state: 'open',
          url: '',
        },
        {
          number: 3,
          title: 'Fix button',
          body: '',
          labels: ['dependencies'],
          state: 'open',
          url: '',
        },
        {
          number: 4,
          title: 'Add dashboard',
          body: '',
          labels: ['feature'],
          state: 'open',
          url: '',
        },
      ];

      const { conflicting, safe } = groupIssuesByConflict(issues, DEFAULT_CONFLICT_LABELS);

      expect(conflicting).toHaveLength(2);
      expect(conflicting.map(i => i.number)).toEqual([1, 3]);

      expect(safe).toHaveLength(2);
      expect(safe.map(i => i.number)).toEqual([2, 4]);
    });

    it('should handle empty input', () => {
      const { conflicting, safe } = groupIssuesByConflict([], DEFAULT_CONFLICT_LABELS);
      expect(conflicting).toHaveLength(0);
      expect(safe).toHaveLength(0);
    });

    it('should use custom conflict labels', () => {
      const issues: Issue[] = [
        {
          number: 1,
          title: 'Task A',
          body: '',
          labels: ['urgent'],
          state: 'open',
          url: '',
        },
        {
          number: 2,
          title: 'Task B',
          body: '',
          labels: ['normal'],
          state: 'open',
          url: '',
        },
      ];

      const { conflicting, safe } = groupIssuesByConflict(issues, ['urgent']);
      expect(conflicting).toHaveLength(1);
      expect(conflicting[0]?.number).toBe(1);
      expect(safe).toHaveLength(1);
    });
  });

  describe('exported constants', () => {
    it('should export DEFAULT_CONFLICT_LABELS', () => {
      expect(DEFAULT_CONFLICT_LABELS).toBeInstanceOf(Array);
      expect(DEFAULT_CONFLICT_LABELS).toContain('dependencies');
      expect(DEFAULT_CONFLICT_LABELS).toContain('infrastructure');
    });

    it('should export CONFLICT_KEYWORDS', () => {
      expect(CONFLICT_KEYWORDS).toBeInstanceOf(Array);
      expect(CONFLICT_KEYWORDS).toContain('package.json');
      expect(CONFLICT_KEYWORDS).toContain('tsconfig');
    });
  });
});
