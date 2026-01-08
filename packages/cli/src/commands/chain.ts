import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Chain, ChainItem, ChainSummary } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const CHAINS_DIR = 'chains';

interface ChainOptions {
  template?: string;
  skipFailed: boolean;
  baseBranch: string;
  dryRun: boolean;
}

interface Config {
  worktreeDir: string;
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
  };
}

interface SessionInfo {
  id: string;
  issueNumber?: number;
  status: string;
  worktreePath?: string;
}

async function loadConfig(cwd: string): Promise<Config | null> {
  try {
    const configPath = join(cwd, CONFIG_DIR, 'config.json');
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadSessions(cwd: string): Promise<SessionInfo[]> {
  try {
    const sessionsPath = join(cwd, CONFIG_DIR, 'sessions.json');
    const content = await readFile(sessionsPath, 'utf-8');
    return JSON.parse(content) as SessionInfo[];
  } catch {
    return [];
  }
}

async function saveChain(cwd: string, chain: Chain): Promise<void> {
  const chainsDir = join(cwd, CONFIG_DIR, CHAINS_DIR);
  await mkdir(chainsDir, { recursive: true });
  await writeFile(
    join(chainsDir, `${chain.id}.json`),
    JSON.stringify(chain, null, 2)
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function printChainStatus(chain: Chain): void {
  console.clear();
  console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║           Dependency Chain               ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

  for (let i = 0; i < chain.items.length; i++) {
    const item = chain.items[i]!;
    const icon =
      item.status === 'pending' ? '\x1b[90m○\x1b[0m' :
      item.status === 'running' ? '\x1b[33m◐\x1b[0m' :
      item.status === 'completed' ? '\x1b[32m●\x1b[0m' :
      item.status === 'skipped' ? '\x1b[90m◌\x1b[0m' :
      '\x1b[31m✗\x1b[0m';

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

function getChainSummary(chain: Chain): ChainSummary {
  return {
    total: chain.items.length,
    completed: chain.items.filter(i => i.status === 'completed').length,
    failed: chain.items.filter(i => i.status === 'failed').length,
    skipped: chain.items.filter(i => i.status === 'skipped').length,
    pending: chain.items.filter(i => i.status === 'pending').length,
  };
}

async function waitForSession(
  cwd: string,
  issueNumber: number,
  timeoutMs: number = 300000
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < timeoutMs) {
    const sessions = await loadSessions(cwd);
    const session = sessions.find(s => s.issueNumber === issueNumber);

    if (session) {
      if (session.status !== lastStatus) {
        lastStatus = session.status;
      }

      if (session.status === 'completed') {
        return { success: true, sessionId: session.id };
      }
      if (session.status === 'failed') {
        return { success: false, sessionId: session.id, error: 'Session failed' };
      }
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  return { success: false, error: 'Session timeout' };
}

async function startChainItem(
  item: ChainItem,
  options: { template?: string; cwd: string }
): Promise<void> {
  const args = ['start', item.issue];

  if (options.template) {
    args.push('--template', options.template);
  }

  // Use --branch to set custom branch name if baseBranch is specified
  if (item.baseBranch && item.baseBranch !== 'develop') {
    // The worktree will be created from the baseBranch
    // We need to pass this info somehow - for now use environment variable
    process.env.CLAUDETREE_BASE_BRANCH = item.baseBranch;
  }

  const proc = spawn('claudetree', args, {
    cwd: options.cwd,
    stdio: 'ignore',
    detached: true,
    env: {
      ...process.env,
      CLAUDETREE_BASE_BRANCH: item.baseBranch,
    },
  });

  proc.unref();

  // Wait for session to be created
  await new Promise(r => setTimeout(r, 3000));
}

function getBranchNameForIssue(issue: string): string {
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

export const chainCommand = new Command('chain')
  .description('Execute a dependency chain of issues (each builds on the previous)')
  .argument('<issues...>', 'Issue numbers in dependency order (first is base)')
  .option('-T, --template <template>', 'Session template (bugfix, feature, refactor)')
  .option('--skip-failed', 'Continue chain even if an issue fails', false)
  .option('-b, --base-branch <branch>', 'Base branch for first issue', 'develop')
  .option('--dry-run', 'Show chain plan without executing', false)
  .action(async (issues: string[], options: ChainOptions) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    if (!config) {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    if (issues.length < 2) {
      console.error('Error: Chain requires at least 2 issues.');
      console.log('Usage: claudetree chain <issue1> <issue2> [issue3...]');
      console.log('Example: claudetree chain 10 11 12');
      process.exit(1);
    }

    // Build chain items
    const chainItems: ChainItem[] = issues.map((issue, idx) => {
      const branchName = getBranchNameForIssue(issue);
      const baseBranch = idx === 0 ? options.baseBranch : getBranchNameForIssue(issues[idx - 1]!);

      return {
        issue,
        order: idx,
        status: 'pending',
        branchName,
        baseBranch,
      };
    });

    const chain: Chain = {
      id: randomUUID().slice(0, 8),
      items: chainItems,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      options: {
        template: options.template,
        skipFailed: options.skipFailed,
        autoMerge: false,
        baseBranch: options.baseBranch,
      },
    };

    // Dry run mode
    if (options.dryRun) {
      console.log('\n\x1b[36m[Dry Run] Chain execution plan:\x1b[0m\n');

      for (let i = 0; i < chain.items.length; i++) {
        const item = chain.items[i]!;
        const arrow = i > 0 ? '  ↓' : '';
        if (arrow) console.log(`\x1b[90m${arrow}\x1b[0m`);

        console.log(`  \x1b[33m${i + 1}.\x1b[0m Issue #${item.issue}`);
        console.log(`     Branch: \x1b[36m${item.branchName}\x1b[0m`);
        console.log(`     Base: \x1b[90m${item.baseBranch}\x1b[0m`);
      }

      console.log('\n\x1b[90mRemove --dry-run to execute this chain.\x1b[0m\n');
      return;
    }

    // Save initial chain state
    await saveChain(cwd, chain);

    console.log(`\nStarting dependency chain: ${chain.id}`);
    console.log(`Issues: ${issues.join(' → ')}`);
    if (options.template) console.log(`Template: ${options.template}`);
    console.log('');

    chain.status = 'running';
    printChainStatus(chain);

    // Execute chain sequentially
    for (let i = 0; i < chain.items.length; i++) {
      const item = chain.items[i]!;

      // Check if previous item failed and skip-failed is false
      if (i > 0) {
        const prevItem = chain.items[i - 1]!;
        if (prevItem.status === 'failed' && !options.skipFailed) {
          item.status = 'skipped';
          item.error = 'Previous item failed';
          chain.updatedAt = new Date();
          await saveChain(cwd, chain);
          printChainStatus(chain);
          continue;
        }
      }

      // Start this item
      item.status = 'running';
      item.startedAt = new Date();
      chain.updatedAt = new Date();
      await saveChain(cwd, chain);
      printChainStatus(chain);

      try {
        // Start the session
        await startChainItem(item, {
          template: options.template,
          cwd,
        });

        // Wait for completion
        const issueNum = parseInt(item.issue, 10);
        if (!isNaN(issueNum)) {
          const result = await waitForSession(cwd, issueNum);

          if (result.success) {
            item.status = 'completed';
            item.sessionId = result.sessionId;
          } else {
            item.status = 'failed';
            item.error = result.error;
          }
        } else {
          // For non-numeric issues, just wait a bit and mark as completed
          // (can't track by issue number)
          item.status = 'completed';
        }

        item.completedAt = new Date();
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        item.completedAt = new Date();
      }

      chain.updatedAt = new Date();
      await saveChain(cwd, chain);
      printChainStatus(chain);
    }

    // Final summary
    const summary = getChainSummary(chain);
    chain.status = summary.failed > 0 ? 'failed' : 'completed';
    chain.updatedAt = new Date();
    await saveChain(cwd, chain);

    console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║            Chain Complete                ║\x1b[0m');
    console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n');

    console.log(`  Completed: \x1b[32m${summary.completed}\x1b[0m`);
    console.log(`  Failed: \x1b[31m${summary.failed}\x1b[0m`);
    console.log(`  Skipped: \x1b[90m${summary.skipped}\x1b[0m`);

    if (summary.completed === summary.total) {
      console.log('\n  \x1b[32m✓ All issues completed successfully!\x1b[0m');
      console.log('\n  Next steps:');
      console.log(`    1. Review each branch's PR`);
      console.log(`    2. Merge in order: ${chain.items.map(i => i.branchName).join(' → ')}`);
    } else if (summary.failed > 0) {
      console.log('\n  \x1b[33m⚠ Some issues failed. Check the logs for details.\x1b[0m');
    }

    console.log(`\n  Chain log: ${join(CONFIG_DIR, CHAINS_DIR, `${chain.id}.json`)}`);
    console.log('  View sessions: claudetree status\n');

    if (summary.failed > 0 && !options.skipFailed) {
      process.exit(1);
    }
  });
