import type { Issue } from '@claudetree/shared';

export interface BustercallItem {
  issue: Issue;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Truncate string to maxLen, adding ellipsis if needed
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function formatDurationShort(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${min}m${remainSec}s`;
}

function renderProgressBar(completed: number, total: number, width: number): string {
  const ratio = total > 0 ? completed / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const bar = '\x1b[32m' + '█'.repeat(filled) + '\x1b[90m' + '░'.repeat(empty) + '\x1b[0m';
  const pct = Math.round(ratio * 100);
  return `${bar} ${pct}%`;
}

function estimateETA(
  completedCount: number,
  startTime: number,
  totalCount: number,
): string {
  if (completedCount === 0) return 'calculating...';
  const elapsed = Date.now() - startTime;
  const avgPerItem = elapsed / completedCount;
  const remaining = totalCount - completedCount;
  const etaMs = avgPerItem * remaining;
  return formatDurationShort(etaMs);
}

/**
 * Print bustercall status to console
 */
export function printStatus(
  items: BustercallItem[],
  startTime?: number,
): void {
  console.clear();
  console.log('\n\x1b[36m=== Bustercall ===\x1b[0m\n');

  const completed = items.filter((i) => i.status === 'completed').length;
  const failed = items.filter((i) => i.status === 'failed').length;
  const running = items.filter((i) => i.status === 'running').length;
  const done = completed + failed;

  // Progress bar
  console.log(`  ${renderProgressBar(done, items.length, 30)}\n`);

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
    let suffix = '';
    if (item.error) {
      suffix = ` \x1b[31m[${truncate(item.error, 30)}]\x1b[0m`;
    } else if (item.status === 'running' && item.startedAt) {
      const elapsed = formatDurationShort(Date.now() - item.startedAt);
      suffix = ` \x1b[90m(${elapsed})\x1b[0m`;
    } else if (item.status === 'completed' && item.startedAt && item.completedAt) {
      const dur = formatDurationShort(item.completedAt - item.startedAt);
      suffix = ` \x1b[90m(${dur})\x1b[0m`;
    }

    console.log(`  ${color}${icon}\x1b[0m #${item.issue.number} - ${title}${suffix}`);
  }

  // Summary line
  const eta = startTime && done < items.length
    ? ` | ETA: \x1b[33m${estimateETA(done, startTime, items.length)}\x1b[0m`
    : '';

  console.log(`\n  [\x1b[32m${completed}\x1b[0m/${items.length}] completed, ${running} running, ${failed} failed${eta}`);
}
