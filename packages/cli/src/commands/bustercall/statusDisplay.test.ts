import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { truncate, printStatus, type BustercallItem } from './statusDisplay.js';
import type { Issue } from '@claudetree/shared';

describe('statusDisplay', () => {
  describe('truncate', () => {
    it('should return string unchanged if shorter than maxLen', () => {
      expect(truncate('short', 10)).toBe('short');
    });

    it('should return string unchanged if equal to maxLen', () => {
      expect(truncate('12345', 5)).toBe('12345');
    });

    it('should truncate and add ellipsis', () => {
      expect(truncate('this is a long string', 10)).toBe('this is...');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle maxLen of 3 (minimum for ellipsis)', () => {
      expect(truncate('abcdef', 3)).toBe('...');
    });
  });

  describe('printStatus', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleClearSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleClearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleClearSpy.mockRestore();
    });

    it('should clear console and print header', () => {
      const items: BustercallItem[] = [];
      printStatus(items);

      expect(consoleClearSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Bustercall'));
    });

    it('should display pending items', () => {
      const items: BustercallItem[] = [
        {
          issue: createMockIssue(1, 'First issue'),
          status: 'pending',
        },
      ];

      printStatus(items);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('#1');
      expect(output).toContain('First issue');
    });

    it('should display running items with correct icon', () => {
      const items: BustercallItem[] = [
        {
          issue: createMockIssue(2, 'Running issue'),
          status: 'running',
        },
      ];

      printStatus(items);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('#2');
    });

    it('should display completed items', () => {
      const items: BustercallItem[] = [
        {
          issue: createMockIssue(3, 'Done issue'),
          status: 'completed',
        },
      ];

      printStatus(items);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('#3');
    });

    it('should display failed items with error', () => {
      const items: BustercallItem[] = [
        {
          issue: createMockIssue(4, 'Failed issue'),
          status: 'failed',
          error: 'Something went wrong',
        },
      ];

      printStatus(items);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('#4');
      expect(output).toContain('Something went wrong');
    });

    it('should display summary counts', () => {
      const items: BustercallItem[] = [
        { issue: createMockIssue(1, 'A'), status: 'completed' },
        { issue: createMockIssue(2, 'B'), status: 'completed' },
        { issue: createMockIssue(3, 'C'), status: 'running' },
        { issue: createMockIssue(4, 'D'), status: 'failed' },
        { issue: createMockIssue(5, 'E'), status: 'pending' },
      ];

      printStatus(items);

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[2/5]');
      expect(output).toContain('1 running');
      expect(output).toContain('1 failed');
    });
  });
});

function createMockIssue(number: number, title: string): Issue {
  return {
    number,
    title,
    body: '',
    labels: [],
    state: 'open',
    url: `https://github.com/owner/repo/issues/${number}`,
  };
}
