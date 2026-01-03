import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubAdapter } from './GitHubAdapter.js';

// Mock Octokit
vi.mock('octokit', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({
          data: {
            number: 42,
            title: 'Add feature X',
            body: 'We need to implement feature X',
            labels: [{ name: 'enhancement' }, { name: 'priority-high' }],
            state: 'open',
            html_url: 'https://github.com/owner/repo/issues/42',
          },
        }),
      },
      pulls: {
        create: vi.fn().mockResolvedValue({
          data: {
            number: 123,
            html_url: 'https://github.com/owner/repo/pull/123',
          },
        }),
      },
      repos: {
        get: vi.fn().mockResolvedValue({
          data: {
            default_branch: 'main',
          },
        }),
      },
    },
  })),
}));

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter('fake-token');
    vi.clearAllMocks();
  });

  describe('getIssue', () => {
    it('should fetch and parse issue data', async () => {
      const issue = await adapter.getIssue('owner', 'repo', 42);

      expect(issue).toEqual({
        number: 42,
        title: 'Add feature X',
        body: 'We need to implement feature X',
        labels: ['enhancement', 'priority-high'],
        state: 'open',
        url: 'https://github.com/owner/repo/issues/42',
      });
    });
  });

  describe('createPR', () => {
    it('should create a pull request', async () => {
      const result = await adapter.createPR({
        owner: 'owner',
        repo: 'repo',
        title: 'feat: Add feature X',
        body: 'Implements #42',
        head: 'issue-42',
        base: 'main',
      });

      expect(result).toEqual({
        number: 123,
        url: 'https://github.com/owner/repo/pull/123',
      });
    });
  });

  describe('getDefaultBranch', () => {
    it('should return default branch name', async () => {
      const branch = await adapter.getDefaultBranch('owner', 'repo');
      expect(branch).toBe('main');
    });
  });

  describe('parseIssueUrl', () => {
    it('should parse GitHub issue URL', () => {
      const result = adapter.parseIssueUrl(
        'https://github.com/owner/repo/issues/42'
      );

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        number: 42,
      });
    });

    it('should return null for invalid URL', () => {
      const result = adapter.parseIssueUrl('not-a-url');
      expect(result).toBeNull();
    });

    it('should parse PR URL as well', () => {
      const result = adapter.parseIssueUrl(
        'https://github.com/owner/repo/pull/99'
      );

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        number: 99,
      });
    });
  });

  describe('generateBranchName', () => {
    it('should generate branch name from issue', () => {
      const branch = adapter.generateBranchName(42, 'Add feature X');
      expect(branch).toBe('issue-42-add-feature-x');
    });

    it('should truncate long titles', () => {
      const longTitle = 'This is a very long issue title that should be truncated';
      const branch = adapter.generateBranchName(1, longTitle);
      expect(branch.length).toBeLessThanOrEqual(50);
    });

    it('should handle special characters', () => {
      const branch = adapter.generateBranchName(5, 'Fix: bug [critical] #123');
      expect(branch).toBe('issue-5-fix-bug-critical-123');
    });
  });
});
