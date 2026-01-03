import { Octokit } from 'octokit';
import type { Issue, CreatePRInput } from '@claudetree/shared';

export interface PRResult {
  number: number;
  url: string;
}

export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  number: number;
}

export class GitHubAdapter {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getIssue(owner: string, repo: string, number: number): Promise<Issue> {
    const { data } = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: number,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body ?? '',
      labels: data.labels.map((l) =>
        typeof l === 'string' ? l : l.name ?? ''
      ),
      state: data.state as 'open' | 'closed',
      url: data.html_url,
    };
  }

  async createPR(input: CreatePRInput): Promise<PRResult> {
    const { data } = await this.octokit.rest.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
    });

    return {
      number: data.number,
      url: data.html_url,
    };
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return data.default_branch;
  }

  parseIssueUrl(url: string): ParsedIssueUrl | null {
    const match = url.match(
      /github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/
    );

    if (!match) return null;

    return {
      owner: match[1]!,
      repo: match[2]!,
      number: parseInt(match[4]!, 10),
    };
  }

  generateBranchName(issueNumber: number, title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
      .replace(/-$/, '');

    return `issue-${issueNumber}-${slug}`;
  }
}
