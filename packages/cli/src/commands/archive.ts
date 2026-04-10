import { Command } from 'commander';
import { join } from 'node:path';
import { access, writeFile, mkdir } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface ArchiveOptions {
  status: string;
  before?: string;
  dryRun: boolean;
  tag?: string[];
}

export const archiveCommand = new Command('archive')
  .description('Archive old sessions to reduce clutter in status/stats')
  .option(
    '--status <statuses>',
    'Archive sessions with these statuses (comma-separated)',
    'completed,failed',
  )
  .option(
    '--before <period>',
    'Only archive sessions older than period (e.g. 7d, 30d)',
  )
  .option('--dry-run', 'Show what would be archived', false)
  .option('--tag <tags...>', 'Only archive sessions with these tags')
  .action(async (options: ArchiveOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    const statusFilter = new Set(options.status.split(',').map((s) => s.trim()));

    let candidates = sessions.filter((s) => statusFilter.has(s.status));

    // Time filter
    if (options.before) {
      const match = options.before.match(/^(\d+)([hdwm])$/);
      if (match) {
        const val = parseInt(match[1]!, 10);
        const unit = match[2]!;
        const msMap: Record<string, number> = {
          h: 3_600_000, d: 86_400_000, w: 604_800_000, m: 2_592_000_000,
        };
        const cutoff = Date.now() - val * (msMap[unit] ?? 86_400_000);
        candidates = candidates.filter(
          (s) => new Date(s.updatedAt).getTime() < cutoff,
        );
      }
    }

    // Tag filter
    if (options.tag?.length) {
      const filterTags = new Set(options.tag);
      candidates = candidates.filter(
        (s) => s.tags?.some((t: string) => filterTags.has(t)),
      );
    }

    if (candidates.length === 0) {
      console.log('No sessions to archive.');
      process.exit(0);
    }

    if (options.dryRun) {
      console.log(`\nWould archive ${candidates.length} session(s):\n`);
      for (const s of candidates) {
        const issue = s.issueNumber ? `#${s.issueNumber}` : s.id.slice(0, 8);
        console.log(`  ${issue} | ${s.status} | ${new Date(s.updatedAt).toLocaleDateString()}`);
      }
      return;
    }

    // Save to archive file
    const archiveDir = join(configDir, 'archive');
    await mkdir(archiveDir, { recursive: true });

    const archivePath = join(archiveDir, `archive-${Date.now()}.json`);
    let totalCost = 0;
    for (const s of candidates) {
      if (s.usage) totalCost += s.usage.totalCostUsd;
    }

    await writeFile(archivePath, JSON.stringify({
      archivedAt: new Date().toISOString(),
      count: candidates.length,
      totalCost,
      sessions: candidates,
    }, null, 2));

    // Remove archived sessions from active list
    const archivedIds = new Set(candidates.map((s) => s.id));
    const remaining = sessions.filter((s) => !archivedIds.has(s.id));

    const sessionsPath = join(configDir, 'sessions.json');
    await writeFile(sessionsPath, JSON.stringify(remaining, null, 2));

    console.log(`\n\x1b[32m✓\x1b[0m Archived ${candidates.length} session(s)`);
    console.log(`  Total cost archived: $${totalCost.toFixed(4)}`);
    console.log(`  Archive: ${archivePath}`);
    console.log(`  Remaining active: ${remaining.length} session(s)`);
  });
