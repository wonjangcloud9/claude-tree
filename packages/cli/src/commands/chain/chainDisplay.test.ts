import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  truncate,
  printChainStatus,
  getChainSummary,
  getBranchNameForIssue,
} from './chainDisplay.js';
import type { Chain, ChainItem } from '@claudetree/shared';

describe('chainDisplay', () => {
  describe('truncate', () => {
    it('should return string unchanged if shorter than maxLen', () => {
      expect(truncate('short', 10)).toBe('short');
    });

    it('should truncate and add ellipsis', () => {
      expect(truncate('this is a long string', 10)).toBe('this is...');
    });
  });

  describe('getBranchNameForIssue', () => {
    it('should create branch name for numeric issue', () => {
      expect(getBranchNameForIssue('42')).toBe('issue-42');
      expect(getBranchNameForIssue('123')).toBe('issue-123');
    });

    it('should sanitize task name', () => {
      expect(getBranchNameForIssue('add user authentication')).toBe('add-user-authentication');
    });

    it('should handle special characters', () => {
      expect(getBranchNameForIssue('Fix: bug #123!')).toBe('fix-bug-123');
    });

    it('should limit branch name length', () => {
      const longName = 'a'.repeat(100);
      const result = getBranchNameForIssue(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle leading/trailing dashes', () => {
      expect(getBranchNameForIssue('--test--')).toBe('test');
    });
  });

  describe('getChainSummary', () => {
    it('should calculate summary correctly', () => {
      const chain = createMockChain([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' },
        { status: 'skipped' },
        { status: 'pending' },
      ]);

      const summary = getChainSummary(chain);

      expect(summary.total).toBe(5);
      expect(summary.completed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(summary.pending).toBe(1);
    });

    it('should handle empty chain', () => {
      const chain: Chain = {
        id: 'test',
        items: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        options: { baseBranch: 'develop', skipFailed: false, autoMerge: false },
      };

      const summary = getChainSummary(chain);

      expect(summary.total).toBe(0);
      expect(summary.completed).toBe(0);
    });
  });

  describe('printChainStatus', () => {
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
      const chain = createMockChain([{ status: 'pending' }]);
      printChainStatus(chain);

      expect(consoleClearSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Dependency Chain'));
    });

    it('should display chain items with status', () => {
      const chain = createMockChain([
        { status: 'completed' },
        { status: 'running' },
        { status: 'pending' },
      ]);

      printChainStatus(chain);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('#1');
      expect(output).toContain('#2');
      expect(output).toContain('#3');
    });

    it('should show error for failed items', () => {
      const chain = createMockChain([
        { status: 'failed', error: 'Build failed' },
      ]);

      printChainStatus(chain);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Build failed');
    });

    it('should display summary counts', () => {
      const chain = createMockChain([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
      ]);

      printChainStatus(chain);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('[2/3]');
    });
  });
});

function createMockChain(
  itemStatuses: Array<{ status: ChainItem['status']; error?: string }>
): Chain {
  return {
    id: 'test-chain',
    items: itemStatuses.map((s, idx) => ({
      issue: String(idx + 1),
      order: idx,
      status: s.status,
      branchName: `issue-${idx + 1}`,
      baseBranch: idx === 0 ? 'develop' : `issue-${idx}`,
      error: s.error,
    })),
    status: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
    options: { baseBranch: 'develop', skipFailed: false, autoMerge: false },
  };
}
