import type { Issue } from '@claudetree/shared';

/**
 * Keywords that indicate potential conflicts with config/shared files
 */
export const CONFLICT_KEYWORDS = [
  'package.json',
  'tsconfig',
  'vitest',
  'eslint',
  'config',
  'dependencies',
  'devDependencies',
  'workspace',
  'monorepo',
  'pnpm-lock',
  'package-lock',
  'yarn.lock',
  'infrastructure',
  '설정', // Korean: config
  '의존성', // Korean: dependencies
  '패키지', // Korean: package
];

/**
 * Labels that typically indicate config/infra changes
 */
export const DEFAULT_CONFLICT_LABELS = [
  'dependencies',
  'infrastructure',
  'config',
  'setup',
  'tooling',
  'build',
  'ci',
  'chore',
];

/**
 * Check if an issue might conflict with config/shared files
 */
export function detectPotentialConflict(issue: Issue, conflictLabels: string[]): boolean {
  // Check labels
  const hasConflictLabel = issue.labels.some((label) =>
    conflictLabels.some((cl) => label.toLowerCase().includes(cl.toLowerCase()))
  );

  // Check title for conflict keywords
  const titleLower = issue.title.toLowerCase();
  const hasConflictKeyword = CONFLICT_KEYWORDS.some((kw) =>
    titleLower.includes(kw.toLowerCase())
  );

  return hasConflictLabel || hasConflictKeyword;
}

/**
 * Group issues by conflict potential
 */
export function groupIssuesByConflict(
  issues: Issue[],
  conflictLabels: string[]
): { conflicting: Issue[]; safe: Issue[] } {
  const conflicting: Issue[] = [];
  const safe: Issue[] = [];

  for (const issue of issues) {
    if (detectPotentialConflict(issue, conflictLabels)) {
      conflicting.push(issue);
    } else {
      safe.push(issue);
    }
  }

  return { conflicting, safe };
}
