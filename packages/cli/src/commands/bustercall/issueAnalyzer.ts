import type { Issue } from '@claudetree/shared';

export type ComplexityLevel = 'S' | 'M' | 'L' | 'XL';

export interface IssueAnalysis {
  issue: Issue;
  complexity: ComplexityLevel;
  estimatedMinutes: number;
  category: string;
}

const COMPLEXITY_LABELS: Record<string, ComplexityLevel> = {
  'good first issue': 'S',
  'easy': 'S',
  'trivial': 'S',
  'small': 'S',
  'typo': 'S',
  'docs': 'S',
  'documentation': 'S',
  'bug': 'M',
  'fix': 'M',
  'enhancement': 'M',
  'feature': 'L',
  'refactor': 'L',
  'performance': 'L',
  'security': 'L',
  'breaking': 'XL',
  'epic': 'XL',
  'migration': 'XL',
  'architecture': 'XL',
};

const CATEGORY_LABELS: Record<string, string> = {
  'bug': 'bugfix',
  'fix': 'bugfix',
  'error': 'bugfix',
  'feature': 'feature',
  'enhancement': 'feature',
  'docs': 'docs',
  'documentation': 'docs',
  'refactor': 'refactor',
  'test': 'test',
  'testing': 'test',
  'performance': 'performance',
  'security': 'security',
};

const ESTIMATED_MINUTES: Record<ComplexityLevel, number> = {
  S: 5,
  M: 15,
  L: 30,
  XL: 60,
};

function estimateFromBody(body: string): ComplexityLevel {
  if (!body) return 'M';

  const lines = body.split('\n').filter((l) => l.trim().length > 0);
  const checkboxes = body.match(/- \[[ x]\]/g)?.length ?? 0;
  const codeBlocks = body.match(/```/g)?.length ?? 0;
  const fileRefs = body.match(/\b[\w/-]+\.\w{1,5}\b/g)?.length ?? 0;

  // Score based on content richness
  let score = 0;
  score += Math.min(lines.length / 5, 4); // up to 4 pts for length
  score += Math.min(checkboxes, 3);         // up to 3 pts for tasks
  score += Math.min(codeBlocks / 2, 2);     // up to 2 pts for code
  score += Math.min(fileRefs / 2, 3);       // up to 3 pts for file refs

  if (score <= 2) return 'S';
  if (score <= 5) return 'M';
  if (score <= 8) return 'L';
  return 'XL';
}

function detectCategory(issue: Issue): string {
  for (const label of issue.labels) {
    const lower = label.toLowerCase();
    if (CATEGORY_LABELS[lower]) {
      return CATEGORY_LABELS[lower]!;
    }
  }

  const titleLower = issue.title.toLowerCase();
  if (titleLower.includes('fix') || titleLower.includes('bug')) return 'bugfix';
  if (titleLower.includes('add') || titleLower.includes('feat')) return 'feature';
  if (titleLower.includes('refactor')) return 'refactor';
  if (titleLower.includes('doc')) return 'docs';
  if (titleLower.includes('test')) return 'test';

  return 'general';
}

/**
 * Analyze an issue to estimate complexity, time, and category.
 */
export function analyzeIssue(issue: Issue): IssueAnalysis {
  // Try label-based complexity first
  let complexity: ComplexityLevel | null = null;
  for (const label of issue.labels) {
    const lower = label.toLowerCase();
    if (COMPLEXITY_LABELS[lower]) {
      complexity = COMPLEXITY_LABELS[lower]!;
      break;
    }
  }

  // Fallback to body analysis
  if (!complexity) {
    complexity = estimateFromBody(issue.body);
  }

  return {
    issue,
    complexity,
    estimatedMinutes: ESTIMATED_MINUTES[complexity],
    category: detectCategory(issue),
  };
}

/**
 * Analyze all issues and return summary stats.
 */
export function analyzeIssues(issues: Issue[]): {
  analyses: IssueAnalysis[];
  totalEstimatedMinutes: number;
  parallelEstimatedMinutes: number;
  complexityCounts: Record<ComplexityLevel, number>;
} {
  const analyses = issues.map(analyzeIssue);

  const totalEstimatedMinutes = analyses.reduce(
    (sum, a) => sum + a.estimatedMinutes, 0,
  );

  const complexityCounts: Record<ComplexityLevel, number> = {
    S: 0, M: 0, L: 0, XL: 0,
  };
  for (const a of analyses) {
    complexityCounts[a.complexity]++;
  }

  // Parallel estimate: longest chain
  const maxSingle = Math.max(...analyses.map((a) => a.estimatedMinutes), 0);
  const parallelEstimatedMinutes = Math.max(maxSingle, totalEstimatedMinutes / 3);

  return {
    analyses,
    totalEstimatedMinutes,
    parallelEstimatedMinutes: Math.round(parallelEstimatedMinutes),
    complexityCounts,
  };
}
