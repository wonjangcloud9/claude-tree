import type { Chain, ChainSummary } from '@claudetree/shared';

/**
 * Truncate string to maxLen, adding ellipsis if needed
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Get branch name for an issue (number or task name)
 */
export function getBranchNameForIssue(issue: string): string {
  // If it's a number, assume issue number
  if (/^\d+$/.test(issue)) {
    return `issue-${issue}`;
  }
  // Otherwise, sanitize the task name
  return issue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Get summary counts for a chain
 */
export function getChainSummary(chain: Chain): ChainSummary {
  return {
    total: chain.items.length,
    completed: chain.items.filter((i) => i.status === 'completed').length,
    failed: chain.items.filter((i) => i.status === 'failed').length,
    skipped: chain.items.filter((i) => i.status === 'skipped').length,
    pending: chain.items.filter((i) => i.status === 'pending').length,
  };
}

/**
 * Print chain status to console
 */
export function printChainStatus(chain: Chain): void {
  console.clear();
  console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║           Dependency Chain               ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

  for (let i = 0; i < chain.items.length; i++) {
    const item = chain.items[i]!;
    const icon =
      item.status === 'pending'
        ? '\x1b[90m○\x1b[0m'
        : item.status === 'running'
          ? '\x1b[33m◐\x1b[0m'
          : item.status === 'completed'
            ? '\x1b[32m●\x1b[0m'
            : item.status === 'skipped'
              ? '\x1b[90m◌\x1b[0m'
              : '\x1b[31m✗\x1b[0m';

    const arrow = i < chain.items.length - 1 ? '\x1b[90m  │\x1b[0m' : '';
    const base = item.baseBranch ? `\x1b[90m← ${item.baseBranch}\x1b[0m` : '';
    const branch = item.branchName ? `\x1b[36m[${item.branchName}]\x1b[0m ` : '';
    const error = item.error ? `\x1b[31m (${truncate(item.error, 30)})\x1b[0m` : '';

    console.log(`  ${icon} ${branch}#${item.issue}${error} ${base}`);
    if (arrow) console.log(arrow);
  }

  const summary = getChainSummary(chain);
  console.log(`\n  \x1b[90m[${summary.completed}/${summary.total}] completed`);
  if (summary.failed > 0) console.log(`  \x1b[31m${summary.failed} failed\x1b[0m`);
  if (summary.skipped > 0) console.log(`  \x1b[90m${summary.skipped} skipped\x1b[0m`);
  console.log('\x1b[0m');
}
