import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG_DIR = '.claudetree';
const CONFIG_FILE = 'config.json';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const ICONS = {
  pass: `${COLORS.green}✓${COLORS.reset}`,
  fail: `${COLORS.red}✗${COLORS.reset}`,
  warn: `${COLORS.yellow}!${COLORS.reset}`,
};

async function checkGitRepo(): Promise<CheckResult> {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    return { name: 'Git Repository', status: 'pass', message: 'Inside a git repository' };
  } catch {
    return {
      name: 'Git Repository',
      status: 'fail',
      message: 'Not a git repository',
      fix: 'Run: git init',
    };
  }
}

async function checkClaudeCli(): Promise<CheckResult> {
  try {
    const stdout = execSync('claude --version', { stdio: 'pipe', encoding: 'utf-8' });
    const version = stdout.trim().split('\n')[0];
    return { name: 'Claude CLI', status: 'pass', message: `Installed (${version})` };
  } catch {
    return {
      name: 'Claude CLI',
      status: 'fail',
      message: 'Claude CLI not found',
      fix: 'Install: npm install -g @anthropic-ai/claude-code',
    };
  }
}

async function checkGhCli(): Promise<CheckResult> {
  try {
    const stdout = execSync('gh --version', { stdio: 'pipe', encoding: 'utf-8' });
    const version = stdout.trim().split('\n')[0];
    return { name: 'GitHub CLI', status: 'pass', message: `Installed (${version})` };
  } catch {
    return {
      name: 'GitHub CLI',
      status: 'warn',
      message: 'GitHub CLI not found (optional)',
      fix: 'Install: brew install gh',
    };
  }
}

async function checkGhAuth(): Promise<CheckResult> {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return { name: 'GitHub Auth', status: 'pass', message: 'Authenticated' };
  } catch {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      return { name: 'GitHub Auth', status: 'pass', message: 'Using GITHUB_TOKEN env' };
    }
    return {
      name: 'GitHub Auth',
      status: 'warn',
      message: 'Not authenticated (needed for issue fetching)',
      fix: 'Run: gh auth login  OR  export GITHUB_TOKEN=<token>',
    };
  }
}

async function checkClaudetreeInit(): Promise<CheckResult> {
  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_DIR, CONFIG_FILE);

  try {
    await access(configPath);
    return { name: 'claudetree Init', status: 'pass', message: 'Initialized (.claudetree/config.json exists)' };
  } catch {
    return {
      name: 'claudetree Init',
      status: 'fail',
      message: 'Not initialized in this directory',
      fix: 'Run: ct init',
    };
  }
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10);

  if (major >= 18) {
    return { name: 'Node.js', status: 'pass', message: `${version} (>= 18 required)` };
  }
  return {
    name: 'Node.js',
    status: 'fail',
    message: `${version} (>= 18 required)`,
    fix: 'Upgrade Node.js to v18 or higher',
  };
}

async function checkAnthropicKey(): Promise<CheckResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    const masked = key.slice(0, 10) + '...' + key.slice(-4);
    return { name: 'Anthropic API Key', status: 'pass', message: `Set (${masked})` };
  }
  return {
    name: 'Anthropic API Key',
    status: 'warn',
    message: 'Not set (Claude CLI may use its own auth)',
    fix: 'export ANTHROPIC_API_KEY=<your-key>',
  };
}

function printResult(result: CheckResult): void {
  const icon = ICONS[result.status];
  console.log(`  ${icon} ${COLORS.bold}${result.name}${COLORS.reset}`);
  console.log(`    ${COLORS.dim}${result.message}${COLORS.reset}`);
  if (result.fix && result.status !== 'pass') {
    console.log(`    ${COLORS.cyan}→ ${result.fix}${COLORS.reset}`);
  }
}

export const doctorCommand = new Command('doctor')
  .description('Check environment and dependencies for claudetree')
  .option('-q, --quiet', 'Only show failures and warnings', false)
  .action(async (options: { quiet: boolean }) => {
    console.log(`\n${COLORS.bold}claudetree doctor${COLORS.reset}\n`);
    console.log(`${COLORS.dim}Checking your environment...${COLORS.reset}\n`);

    const checks = [
      checkNodeVersion,
      checkGitRepo,
      checkClaudeCli,
      checkGhCli,
      checkGhAuth,
      checkAnthropicKey,
      checkClaudetreeInit,
    ];

    const results: CheckResult[] = [];

    for (const check of checks) {
      const result = await check();
      results.push(result);

      if (!options.quiet || result.status !== 'pass') {
        printResult(result);
        console.log();
      }
    }

    const fails = results.filter((r) => r.status === 'fail');
    const warns = results.filter((r) => r.status === 'warn');
    const passes = results.filter((r) => r.status === 'pass');

    console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
    console.log(
      `\n  ${COLORS.green}${passes.length} passed${COLORS.reset}  ` +
        `${warns.length > 0 ? `${COLORS.yellow}${warns.length} warnings${COLORS.reset}  ` : ''}` +
        `${fails.length > 0 ? `${COLORS.red}${fails.length} failed${COLORS.reset}` : ''}`
    );

    if (fails.length === 0) {
      console.log(`\n  ${COLORS.green}${COLORS.bold}✓ Ready to use claudetree!${COLORS.reset}\n`);
      if (warns.length > 0) {
        console.log(`  ${COLORS.dim}Fix warnings above for full functionality.${COLORS.reset}\n`);
      }
    } else {
      console.log(`\n  ${COLORS.red}${COLORS.bold}✗ Fix the issues above before using claudetree.${COLORS.reset}\n`);
      process.exit(1);
    }
  });
