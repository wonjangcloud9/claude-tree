import type { Issue } from '@claudetree/shared';

/**
 * Priority labels ordered from highest to lowest priority.
 * Issues with higher-priority labels are processed first.
 */
export const PRIORITY_LABELS: Record<string, number> = {
  'critical': 1,
  'p0': 1,
  'urgent': 2,
  'p1': 2,
  'high': 3,
  'priority': 3,
  'high-priority': 3,
  'p2': 4,
  'medium': 5,
  'p3': 6,
  'low': 7,
  'p4': 7,
  'low-priority': 7,
};

function getPriority(issue: Issue): number {
  let best = 999;
  for (const label of issue.labels) {
    const lower = label.toLowerCase();
    const p = PRIORITY_LABELS[lower];
    if (p !== undefined && p < best) {
      best = p;
    }
  }
  return best;
}

export type SortStrategy = 'priority' | 'newest' | 'oldest';

/**
 * Sort issues by the given strategy.
 */
export function sortIssues(issues: Issue[], strategy: SortStrategy): Issue[] {
  const sorted = [...issues];

  switch (strategy) {
    case 'priority':
      sorted.sort((a, b) => getPriority(a) - getPriority(b));
      break;
    case 'newest':
      sorted.sort((a, b) => b.number - a.number);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.number - b.number);
      break;
  }

  return sorted;
}
