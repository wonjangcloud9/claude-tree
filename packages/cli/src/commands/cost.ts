import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

interface CostOptions {
  json: boolean;
  days: string;
  budget?: string;
  batch?: string;
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function renderBar(value: number, max: number, width: number): string {
  if (max === 0) return ' '.repeat(width);
  const filled = Math.round((value / max) * width);
  return `${GREEN}${'█'.repeat(filled)}${DIM}${'░'.repeat(width - filled)}${RESET}`;
}

export const costCommand = new Command('cost')
  .description('Cost analytics across all sessions')
  .option('--json', 'Output as JSON', false)
  .option('-d, --days <n>', 'Number of days to analyze', '7')
  .option('--budget <usd>', 'Daily budget in USD (shows warnings when exceeded)')
  .option('-b, --batch <batchId>', 'Filter by bustercall batch ID')
  .action(async (options: CostOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "ct init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    let sessions = await sessionRepo.findAll();

    // Filter by batch
    if (options.batch) {
      const batchTag = options.batch.startsWith('bustercall:')
        ? options.batch
        : `bustercall:${options.batch}`;
      sessions = sessions.filter((s) => s.tags?.includes(batchTag));
    }

    const days = parseInt(options.days, 10) || 7;
    const budget = options.budget ? parseFloat(options.budget) : undefined;

    // Calculate daily costs
    const dailyCosts = new Map<string, { cost: number; sessions: number; tokens: number }>();
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dailyCosts.set(getDateKey(date), { cost: 0, sessions: 0, tokens: 0 });
    }

    let totalCost = 0;
    let totalTokens = 0;
    let totalSessions = 0;

    // Per-batch costs
    const batchCosts = new Map<string, { cost: number; sessions: number }>();

    for (const session of sessions) {
      if (!session.usage) continue;

      const dateKey = getDateKey(new Date(session.createdAt));
      const day = dailyCosts.get(dateKey);
      if (day) {
        day.cost += session.usage.totalCostUsd;
        day.sessions++;
        day.tokens += session.usage.inputTokens + session.usage.outputTokens;
      }

      totalCost += session.usage.totalCostUsd;
      totalTokens += session.usage.inputTokens + session.usage.outputTokens;
      totalSessions++;

      // Track batch costs
      const batchTag = session.tags?.find((t) => t.startsWith('bustercall:'));
      if (batchTag) {
        const existing = batchCosts.get(batchTag) ?? { cost: 0, sessions: 0 };
        existing.cost += session.usage.totalCostUsd;
        existing.sessions++;
        batchCosts.set(batchTag, existing);
      }
    }

    if (options.json) {
      console.log(JSON.stringify({
        totalCost,
        totalTokens,
        totalSessions,
        dailyCosts: Object.fromEntries(dailyCosts),
        batchCosts: Object.fromEntries(batchCosts),
      }, null, 2));
      return;
    }

    // Header
    console.log(`\n${BOLD}${CYAN}Cost Analytics${RESET} (last ${days} days)\n`);

    // Summary
    console.log(`  ${BOLD}Total Cost:${RESET}     ${GREEN}$${totalCost.toFixed(4)}${RESET}`);
    console.log(`  ${BOLD}Total Tokens:${RESET}   ${totalTokens.toLocaleString()}`);
    console.log(`  ${BOLD}Sessions:${RESET}       ${totalSessions}`);
    if (totalSessions > 0) {
      console.log(`  ${BOLD}Avg/Session:${RESET}    $${(totalCost / totalSessions).toFixed(4)}`);
    }

    // Daily breakdown
    const maxDailyCost = Math.max(...[...dailyCosts.values()].map((d) => d.cost), 0.001);

    console.log(`\n  ${BOLD}Daily Breakdown:${RESET}\n`);

    const sortedDays = [...dailyCosts.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [date, data] of sortedDays) {
      const bar = renderBar(data.cost, maxDailyCost, 20);
      const overBudget = budget && data.cost > budget
        ? ` ${RED}OVER BUDGET${RESET}`
        : '';
      const costStr = data.cost > 0
        ? `$${data.cost.toFixed(4)}`
        : `${DIM}$0.0000${RESET}`;
      console.log(`    ${date} ${bar} ${costStr} (${data.sessions} sessions)${overBudget}`);
    }

    // Budget warning
    if (budget) {
      const todayKey = getDateKey(today);
      const todayCost = dailyCosts.get(todayKey)?.cost ?? 0;
      const pct = Math.round((todayCost / budget) * 100);
      console.log(`\n  ${BOLD}Budget:${RESET}  $${budget.toFixed(2)}/day`);
      if (todayCost > budget) {
        console.log(`  ${RED}Today: $${todayCost.toFixed(4)} (${pct}%) - EXCEEDED${RESET}`);
      } else if (todayCost > budget * 0.8) {
        console.log(`  ${YELLOW}Today: $${todayCost.toFixed(4)} (${pct}%) - approaching limit${RESET}`);
      } else {
        console.log(`  ${GREEN}Today: $${todayCost.toFixed(4)} (${pct}%) - within budget${RESET}`);
      }
    }

    // Batch costs
    if (batchCosts.size > 0) {
      console.log(`\n  ${BOLD}Batch Costs:${RESET}\n`);
      const sorted = [...batchCosts.entries()].sort(([, a], [, b]) => b.cost - a.cost);
      for (const [batch, data] of sorted) {
        console.log(`    ${CYAN}${batch}${RESET}: $${data.cost.toFixed(4)} (${data.sessions} sessions)`);
      }
    }

    console.log('');
  });
