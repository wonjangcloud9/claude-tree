import type { Issue } from '@claudetree/shared';

export interface BustercallItem {
  issue: Issue;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Truncate string to maxLen, adding ellipsis if needed
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Print bustercall status to console
 */
export function printStatus(items: BustercallItem[]): void {
  console.clear();
  console.log('\n=== Bustercall ===\n');

  for (const item of items) {
    const icon =
      item.status === 'pending'
        ? '\u25CB'
        : item.status === 'running'
          ? '\u25D0'
          : item.status === 'completed'
            ? '\u25CF'
            : '\u2717';

    const color =
      item.status === 'pending'
        ? '\x1b[90m'
        : item.status === 'running'
          ? '\x1b[33m'
          : item.status === 'completed'
            ? '\x1b[32m'
            : '\x1b[31m';

    const title = truncate(item.issue.title, 40);
    const statusText = item.error ? ` [${item.error}]` : '';

    console.log(`  ${color}${icon}\x1b[0m #${item.issue.number} - ${title}${statusText}`);
  }

  const completed = items.filter((i) => i.status === 'completed').length;
  const failed = items.filter((i) => i.status === 'failed').length;
  const running = items.filter((i) => i.status === 'running').length;

  console.log(`\n[${completed}/${items.length}] completed, ${running} running, ${failed} failed`);
}
