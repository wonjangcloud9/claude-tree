import { GitHubAdapter } from '@claudetree/core';
import type { Issue } from '@claudetree/shared';

export interface ParsedIssueInput {
  issueNumber: number | null;
  issueData: Issue | null;
  branchName: string;
  taskDescription: string | null;
}

export interface ParseIssueOptions {
  token?: string;
  branch?: string;
  githubConfig?: {
    owner: string;
    repo: string;
  };
}

/**
 * Sanitize natural language input to a valid branch name
 */
function sanitizeBranchName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '') // Allow Korean characters
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50); // Max length
}

/**
 * Parse issue input from CLI argument
 * Handles: GitHub URLs, issue numbers, natural language tasks
 */
export async function parseIssueInput(
  input: string,
  options: ParseIssueOptions
): Promise<ParsedIssueInput> {
  const { token, branch: customBranch, githubConfig } = options;

  // Case 1: GitHub URL
  if (input.includes('github.com')) {
    if (!token) {
      throw new Error('GitHub token required for URL. Set GITHUB_TOKEN or use --token.');
    }

    const ghAdapter = new GitHubAdapter(token);
    const parsed = ghAdapter.parseIssueUrl(input);

    if (!parsed) {
      throw new Error('Invalid GitHub URL format.');
    }

    const issueData = await ghAdapter.getIssue(parsed.owner, parsed.repo, parsed.number);
    const branchName = customBranch ?? ghAdapter.generateBranchName(issueData.number, issueData.title);

    return {
      issueNumber: issueData.number,
      issueData,
      branchName,
      taskDescription: null,
    };
  }

  // Case 2: Issue number
  const parsedNumber = parseInt(input, 10);
  const isNumber = !isNaN(parsedNumber);

  if (isNumber) {
    // Try to fetch issue data if we have GitHub config
    if (token && githubConfig) {
      const ghAdapter = new GitHubAdapter(token);
      try {
        const issueData = await ghAdapter.getIssue(
          githubConfig.owner,
          githubConfig.repo,
          parsedNumber
        );
        const branchName = customBranch ?? ghAdapter.generateBranchName(issueData.number, issueData.title);
        return {
          issueNumber: issueData.number,
          issueData,
          branchName,
          taskDescription: null,
        };
      } catch {
        // API failed, fallback to simple branch name
      }
    }

    // Fallback: use issue number without API data
    return {
      issueNumber: parsedNumber,
      issueData: null,
      branchName: customBranch ?? `issue-${parsedNumber}`,
      taskDescription: null,
    };
  }

  // Case 3: Natural language task
  const taskDescription = input;
  const branchName = customBranch ?? `task-${sanitizeBranchName(input)}`;

  return {
    issueNumber: null,
    issueData: null,
    branchName,
    taskDescription,
  };
}
