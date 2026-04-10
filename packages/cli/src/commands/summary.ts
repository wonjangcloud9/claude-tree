import { Command } from 'commander';
import { join } from 'node:path';
import { access, writeFile } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';
import type { Session } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface SummaryOptions {
  since?: string;
  format: string;
  output?: string;
  tag?: string[];
}

function parseRelativeDate(since: string): Date {
  const now = Date.now();
  const match = since.match(/^(\d+)([hdwm])$/);
  if (!match) return new Date(since);

  const val = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const msMap: Record<string, number> = {
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    m: 2_592_000_000,
  };
  return new Date(now - val * (msMap[unit] ?? 86_400_000));
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  return `${hours}h ${min % 60}m`;
}

function generateTextSummary(
  sessions: Session[],
  since: Date,
): string {
  const completed = sessions.filter((s) => s.status === 'completed');
  const failed = sessions.filter((s) => s.status === 'failed');
  const running = sessions.filter((s) => s.status === 'running');

  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const s of sessions) {
    if (s.usage) {
      totalCost += s.usage.totalCostUsd;
      totalInput += s.usage.inputTokens;
      totalOutput += s.usage.outputTokens;
    }
  }

  const successRate = sessions.length > 0
    ? Math.round((completed.length / sessions.length) * 100)
    : 0;

  const lines: string[] = [
    '\x1b[36m╔══════════════════════════════════════════╗\x1b[0m',
    '\x1b[36m║            Session Summary               ║\x1b[0m',
    '\x1b[36m╚══════════════════════════════════════════╝\x1b[0m',
    '',
    `  Period:         Since ${since.toLocaleDateString()}`,
    `  Total sessions: ${sessions.length}`,
    `  \x1b[32mCompleted:\x1b[0m      ${completed.length}`,
    `  \x1b[31mFailed:\x1b[0m         ${failed.length}`,
    `  \x1b[33mRunning:\x1b[0m        ${running.length}`,
    `  Success rate:   ${successRate}%`,
    '',
    `  \x1b[33mTotal cost:\x1b[0m     $${totalCost.toFixed(4)}`,
    `  \x1b[33mTotal tokens:\x1b[0m   ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out`,
  ];

  if (sessions.length > 0) {
    const avgCost = totalCost / sessions.length;
    lines.push(`  Avg cost/session: $${avgCost.toFixed(4)}`);
  }

  // Issues worked on
  const issues = sessions
    .filter((s) => s.issueNumber !== null)
    .map((s) => `#${s.issueNumber}`);
  if (issues.length > 0) {
    lines.push('', `  Issues: ${[...new Set(issues)].join(', ')}`);
  }

  // Tags breakdown
  const tagCounts = new Map<string, number>();
  for (const s of sessions) {
    for (const tag of s.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  if (tagCounts.size > 0) {
    lines.push('', '  Tags:');
    for (const [tag, count] of tagCounts) {
      lines.push(`    ${tag}: ${count} session(s)`);
    }
  }

  // Completed session details
  if (completed.length > 0) {
    lines.push('', '\x1b[32m  Completed Sessions:\x1b[0m');
    for (const s of completed) {
      const issue = s.issueNumber ? `#${s.issueNumber}` : s.id.slice(0, 8);
      const cost = s.usage ? `$${s.usage.totalCostUsd.toFixed(4)}` : '-';
      const dur = formatDuration(
        new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime(),
      );
      lines.push(`    ${issue} | ${cost} | ${dur}`);
    }
  }

  // Failed session details
  if (failed.length > 0) {
    lines.push('', '\x1b[31m  Failed Sessions:\x1b[0m');
    for (const s of failed) {
      const issue = s.issueNumber ? `#${s.issueNumber}` : s.id.slice(0, 8);
      const err = s.lastError
        ? s.lastError.slice(0, 50)
        : 'Unknown error';
      lines.push(`    ${issue} | ${err}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function generateMarkdownSummary(
  sessions: Session[],
  since: Date,
): string {
  const completed = sessions.filter((s) => s.status === 'completed');
  const failed = sessions.filter((s) => s.status === 'failed');

  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const s of sessions) {
    if (s.usage) {
      totalCost += s.usage.totalCostUsd;
      totalInput += s.usage.inputTokens;
      totalOutput += s.usage.outputTokens;
    }
  }

  const successRate = sessions.length > 0
    ? Math.round((completed.length / sessions.length) * 100)
    : 0;

  let md = `# Claude-Tree Session Summary\n\n`;
  md += `> Period: Since ${since.toLocaleDateString()}\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total sessions | ${sessions.length} |\n`;
  md += `| Completed | ${completed.length} |\n`;
  md += `| Failed | ${failed.length} |\n`;
  md += `| Success rate | ${successRate}% |\n`;
  md += `| Total cost | $${totalCost.toFixed(4)} |\n`;
  md += `| Total tokens | ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out |\n\n`;

  if (completed.length > 0) {
    md += `## Completed Sessions\n\n`;
    md += `| Issue | Cost | Duration |\n|-------|------|----------|\n`;
    for (const s of completed) {
      const issue = s.issueNumber ? `#${s.issueNumber}` : s.id.slice(0, 8);
      const cost = s.usage ? `$${s.usage.totalCostUsd.toFixed(4)}` : '-';
      const dur = formatDuration(
        new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime(),
      );
      md += `| ${issue} | ${cost} | ${dur} |\n`;
    }
    md += '\n';
  }

  if (failed.length > 0) {
    md += `## Failed Sessions\n\n`;
    for (const s of failed) {
      const issue = s.issueNumber ? `#${s.issueNumber}` : s.id.slice(0, 8);
      md += `- **${issue}**: ${s.lastError ?? 'Unknown error'}\n`;
    }
    md += '\n';
  }

  md += `---\n*Generated by [claudetree](https://github.com/wonjangcloud9/claude-tree)*\n`;
  return md;
}

export const summaryCommand = new Command('summary')
  .description('Generate a summary of all session activity')
  .option(
    '--since <period>',
    'Time period: 24h, 7d, 30d, or ISO date (default: 24h)',
    '24h',
  )
  .option(
    '-f, --format <format>',
    'Output format: text, markdown, json (default: text)',
    'text',
  )
  .option('-o, --output <file>', 'Save to file')
  .option('--tag <tags...>', 'Filter by tags')
  .action(async (options: SummaryOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error(
        'Error: claudetree not initialized. Run "claudetree init" first.',
      );
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    let sessions = await sessionRepo.findAll();

    const since = parseRelativeDate(options.since ?? '24h');
    sessions = sessions.filter(
      (s) => new Date(s.createdAt).getTime() >= since.getTime(),
    );

    // Tag filter
    if (options.tag?.length) {
      const filterTags = new Set(options.tag);
      sessions = sessions.filter(
        (s) => s.tags?.some((t: string) => filterTags.has(t)),
      );
    }

    if (sessions.length === 0) {
      console.log('No sessions found in the specified period.');
      process.exit(0);
    }

    let output: string;

    if (options.format === 'json') {
      output = JSON.stringify(
        {
          since: since.toISOString(),
          total: sessions.length,
          completed: sessions.filter((s) => s.status === 'completed').length,
          failed: sessions.filter((s) => s.status === 'failed').length,
          totalCost: sessions.reduce(
            (sum, s) => sum + (s.usage?.totalCostUsd ?? 0), 0,
          ),
          sessions: sessions.map((s) => ({
            id: s.id.slice(0, 8),
            status: s.status,
            issueNumber: s.issueNumber,
            cost: s.usage?.totalCostUsd ?? 0,
            tags: s.tags,
          })),
        },
        null,
        2,
      );
    } else if (options.format === 'markdown') {
      output = generateMarkdownSummary(sessions, since);
    } else {
      output = generateTextSummary(sessions, since);
    }

    if (options.output) {
      await writeFile(options.output, output);
      console.log(`Summary saved to ${options.output}`);
    } else {
      console.log(output);
    }
  });
