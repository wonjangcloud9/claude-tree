import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseIssueInput } from './parseIssueInput.js';
import { GitHubAdapter } from '@claudetree/core';

// Mock GitHubAdapter
vi.mock('@claudetree/core', async () => {
  const actual = await vi.importActual('@claudetree/core');
  return {
    ...actual,
    GitHubAdapter: vi.fn().mockImplementation(() => ({
      parseIssueUrl: vi.fn().mockImplementation((url: string) => {
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
        if (!match) return null;
        return {
          owner: match[1],
          repo: match[2],
          number: parseInt(match[4]!, 10),
        };
      }),
      getIssue: vi.fn().mockResolvedValue({
        number: 42,
        title: 'Add feature X',
        body: 'We need to implement feature X',
        labels: ['enhancement'],
        state: 'open',
        url: 'https://github.com/owner/repo/issues/42',
      }),
      generateBranchName: vi.fn().mockImplementation((num: number, title: string) => {
        return `issue-${num}-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
      }),
    })),
  };
});

describe('parseIssueInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GitHub URL input', () => {
    it('should parse GitHub issue URL and fetch issue data', async () => {
      const result = await parseIssueInput(
        'https://github.com/owner/repo/issues/42',
        { token: 'fake-token' }
      );

      expect(result.issueNumber).toBe(42);
      expect(result.issueData).toBeDefined();
      expect(result.issueData?.title).toBe('Add feature X');
      expect(result.branchName).toMatch(/^issue-42/);
    });

    it('should throw error when token not provided for URL', async () => {
      await expect(
        parseIssueInput('https://github.com/owner/repo/issues/42', {})
      ).rejects.toThrow('GitHub token required');
    });

    it('should throw error for invalid GitHub URL', async () => {
      await expect(
        parseIssueInput('https://github.com/invalid-url', { token: 'fake-token' })
      ).rejects.toThrow('Invalid GitHub URL');
    });

    it('should use custom branch name when provided', async () => {
      const result = await parseIssueInput(
        'https://github.com/owner/repo/issues/42',
        { token: 'fake-token', branch: 'custom-branch' }
      );

      expect(result.branchName).toBe('custom-branch');
    });
  });

  describe('Issue number input', () => {
    it('should parse issue number with GitHub config', async () => {
      const result = await parseIssueInput('42', {
        token: 'fake-token',
        githubConfig: { owner: 'owner', repo: 'repo' },
      });

      expect(result.issueNumber).toBe(42);
      expect(result.issueData).toBeDefined();
      expect(result.branchName).toMatch(/^issue-42/);
    });

    it('should parse issue number without GitHub config (fallback branch)', async () => {
      const result = await parseIssueInput('42', {});

      expect(result.issueNumber).toBe(42);
      expect(result.issueData).toBeNull();
      expect(result.branchName).toBe('issue-42');
    });

    it('should gracefully handle API failure', async () => {
      // Mock getIssue to throw
      const mockGetIssue = vi.fn().mockRejectedValue(new Error('API error'));
      vi.mocked(GitHubAdapter).mockImplementationOnce(() => ({
        parseIssueUrl: vi.fn(),
        getIssue: mockGetIssue,
        generateBranchName: vi.fn(),
        createPR: vi.fn(),
        getDefaultBranch: vi.fn(),
        listIssues: vi.fn(),
        octokit: {},
      } as unknown as GitHubAdapter));

      const result = await parseIssueInput('42', {
        token: 'fake-token',
        githubConfig: { owner: 'owner', repo: 'repo' },
      });

      expect(result.issueNumber).toBe(42);
      expect(result.issueData).toBeNull();
      expect(result.branchName).toBe('issue-42');
    });
  });

  describe('Natural language task input', () => {
    it('should parse natural language task as branch name', async () => {
      const result = await parseIssueInput('add user authentication', {});

      expect(result.issueNumber).toBeNull();
      expect(result.issueData).toBeNull();
      expect(result.taskDescription).toBe('add user authentication');
      expect(result.branchName).toBe('task-add-user-authentication');
    });

    it('should sanitize special characters in task name', async () => {
      const result = await parseIssueInput('Fix: bug [critical] #123!', {});

      expect(result.branchName).toBe('task-fix-bug-critical-123');
    });

    it('should handle Korean characters', async () => {
      const result = await parseIssueInput('로그인 기능 추가', {});

      expect(result.taskDescription).toBe('로그인 기능 추가');
      expect(result.branchName).toBe('task-로그인-기능-추가');
    });

    it('should truncate long task names', async () => {
      const longTask = 'this is a very long task description that should be truncated for branch name';
      const result = await parseIssueInput(longTask, {});

      expect(result.branchName.length).toBeLessThanOrEqual(55); // 'task-' + 50 chars
    });
  });
});
