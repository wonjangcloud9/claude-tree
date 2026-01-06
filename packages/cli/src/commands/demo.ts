import { Command } from 'commander';
import * as readline from 'node:readline';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function typeText(text: string, delay = 30): Promise<void> {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delay);
  }
  console.log();
}

async function simulateProgress(steps: string[], delayMs = 800): Promise<void> {
  for (const step of steps) {
    process.stdout.write(`  ${COLORS.dim}○${COLORS.reset} ${step}`);
    await sleep(delayMs);
    process.stdout.write(`\r  ${COLORS.green}✓${COLORS.reset} ${step}\n`);
  }
}

function printBox(lines: string[], color = COLORS.cyan): void {
  const maxLen = Math.max(...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const border = '─'.repeat(maxLen + 2);

  console.log(`${color}┌${border}┐${COLORS.reset}`);
  for (const line of lines) {
    const plainLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = ' '.repeat(maxLen - plainLen);
    console.log(`${color}│${COLORS.reset} ${line}${padding} ${color}│${COLORS.reset}`);
  }
  console.log(`${color}└${border}┘${COLORS.reset}`);
}

async function waitForEnter(message = 'Press Enter to continue...'): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${COLORS.dim}${message}${COLORS.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

async function runDemo(): Promise<void> {
  console.clear();
  console.log(`\n${COLORS.bold}${COLORS.cyan}🌳 claudetree Demo${COLORS.reset}\n`);
  console.log(`${COLORS.dim}This is a simulated walkthrough - no tokens will be consumed.${COLORS.reset}\n`);

  await waitForEnter();

  // Step 1: Issue
  console.clear();
  console.log(`\n${COLORS.bold}Step 1: You have a GitHub issue${COLORS.reset}\n`);

  printBox(
    [
      `${COLORS.bold}Issue #42: Fix login button not responding${COLORS.reset}`,
      '',
      `${COLORS.dim}When clicking the login button, nothing happens.${COLORS.reset}`,
      `${COLORS.dim}Expected: Should redirect to /auth${COLORS.reset}`,
      `${COLORS.dim}Actual: No response${COLORS.reset}`,
      '',
      `${COLORS.yellow}Labels: bug, high-priority${COLORS.reset}`,
    ],
    COLORS.blue
  );

  console.log(`\n${COLORS.dim}Normally you'd copy-paste this and manually implement...${COLORS.reset}`);
  console.log(`${COLORS.green}With claudetree, just run one command:${COLORS.reset}\n`);
  console.log(`  ${COLORS.cyan}$ ct start https://github.com/you/repo/issues/42${COLORS.reset}\n`);

  await waitForEnter();

  // Step 2: Worktree creation
  console.clear();
  console.log(`\n${COLORS.bold}Step 2: claudetree creates an isolated workspace${COLORS.reset}\n`);

  await simulateProgress([
    'Fetching issue #42 from GitHub...',
    'Creating branch: fix/issue-42-login-button',
    'Creating worktree: .worktrees/issue-42-fix-login/',
    'Initializing Claude session...',
  ]);

  console.log(`\n${COLORS.dim}Your main branch stays untouched.${COLORS.reset}`);
  console.log(`${COLORS.dim}Claude works in a completely isolated directory.${COLORS.reset}\n`);

  printBox(
    [
      `${COLORS.bold}Project Structure${COLORS.reset}`,
      '',
      `my-app/                 ${COLORS.dim}← You work here${COLORS.reset}`,
      `├── src/`,
      `└── .worktrees/`,
      `    └── issue-42-fix-login/  ${COLORS.cyan}← Claude works here${COLORS.reset}`,
    ],
    COLORS.green
  );

  await waitForEnter();

  // Step 3: Claude working
  console.clear();
  console.log(`\n${COLORS.bold}Step 3: Claude works autonomously${COLORS.reset}\n`);

  console.log(`${COLORS.cyan}Claude:${COLORS.reset} I'll analyze the login button issue...\n`);

  await typeText(`${COLORS.dim}> Reading src/components/LoginButton.tsx...${COLORS.reset}`, 20);
  await sleep(500);
  await typeText(`${COLORS.dim}> Found the issue: onClick handler is missing await${COLORS.reset}`, 20);
  await sleep(500);
  await typeText(`${COLORS.dim}> Editing src/components/LoginButton.tsx...${COLORS.reset}`, 20);
  await sleep(500);
  await typeText(`${COLORS.dim}> Running npm test...${COLORS.reset}`, 20);
  await sleep(800);

  console.log(`\n${COLORS.green}✓ All tests passing${COLORS.reset}\n`);

  await typeText(`${COLORS.dim}> Creating commit: "fix: add await to login handler"${COLORS.reset}`, 20);
  await typeText(`${COLORS.dim}> Pushing to origin/fix/issue-42-login-button...${COLORS.reset}`, 20);
  await typeText(`${COLORS.dim}> Creating pull request...${COLORS.reset}`, 20);

  await waitForEnter();

  // Step 4: Result
  console.clear();
  console.log(`\n${COLORS.bold}Step 4: PR is ready for review!${COLORS.reset}\n`);

  printBox(
    [
      `${COLORS.bold}${COLORS.green}Pull Request #123${COLORS.reset}`,
      '',
      `${COLORS.bold}fix: add await to login handler${COLORS.reset}`,
      '',
      `Fixes #42`,
      '',
      `${COLORS.dim}Changes:${COLORS.reset}`,
      `  ${COLORS.green}+ await${COLORS.reset} router.push('/auth')`,
      `  ${COLORS.red}- ${COLORS.reset}router.push('/auth')`,
      '',
      `${COLORS.cyan}→ github.com/you/repo/pull/123${COLORS.reset}`,
    ],
    COLORS.green
  );

  console.log(`\n${COLORS.dim}Meanwhile, you were doing something else entirely.${COLORS.reset}`);
  console.log(`${COLORS.dim}Now just review and merge!${COLORS.reset}\n`);

  await waitForEnter();

  // Step 5: Parallel
  console.clear();
  console.log(`\n${COLORS.bold}Bonus: Run multiple issues in parallel!${COLORS.reset}\n`);

  console.log(`  ${COLORS.cyan}$ ct start 42${COLORS.reset}  ${COLORS.dim}# Fix login button${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}$ ct start 43${COLORS.reset}  ${COLORS.dim}# Add dark mode${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}$ ct start 44${COLORS.reset}  ${COLORS.dim}# Update deps${COLORS.reset}\n`);

  console.log(`${COLORS.dim}Monitor all sessions:${COLORS.reset}\n`);
  console.log(`  ${COLORS.cyan}$ ct status${COLORS.reset}  ${COLORS.dim}# CLI view${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}$ ct web${COLORS.reset}     ${COLORS.dim}# Web dashboard at localhost:3000${COLORS.reset}\n`);

  printBox(
    [
      `${COLORS.bold}Session Status${COLORS.reset}`,
      '',
      `${COLORS.green}●${COLORS.reset} issue-42  ${COLORS.dim}running${COLORS.reset}   fix login button`,
      `${COLORS.green}●${COLORS.reset} issue-43  ${COLORS.dim}running${COLORS.reset}   add dark mode`,
      `${COLORS.yellow}●${COLORS.reset} issue-44  ${COLORS.dim}pending${COLORS.reset}   update dependencies`,
    ],
    COLORS.magenta
  );

  await waitForEnter();

  // Final
  console.clear();
  console.log(`\n${COLORS.bold}${COLORS.green}🎉 That's claudetree!${COLORS.reset}\n`);

  console.log(`${COLORS.bold}Quick Start:${COLORS.reset}\n`);
  console.log(`  ${COLORS.cyan}1.${COLORS.reset} ct init                    ${COLORS.dim}# Initialize in your project${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}2.${COLORS.reset} ct doctor                  ${COLORS.dim}# Check everything is ready${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}3.${COLORS.reset} ct start <issue-url>       ${COLORS.dim}# Start working on an issue${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}4.${COLORS.reset} ct status                  ${COLORS.dim}# Monitor progress${COLORS.reset}\n`);

  console.log(`${COLORS.bold}Key Commands:${COLORS.reset}\n`);
  console.log(`  ct start <issue>     ${COLORS.dim}Create worktree + start Claude${COLORS.reset}`);
  console.log(`  ct status            ${COLORS.dim}View all sessions${COLORS.reset}`);
  console.log(`  ct stop [id]         ${COLORS.dim}Stop a session${COLORS.reset}`);
  console.log(`  ct web               ${COLORS.dim}Open web dashboard${COLORS.reset}`);
  console.log(`  ct batch <label>     ${COLORS.dim}Process multiple issues${COLORS.reset}\n`);

  console.log(`${COLORS.dim}Learn more: https://github.com/wonjangcloud9/claude-tree${COLORS.reset}\n`);
}

export const demoCommand = new Command('demo')
  .description('Interactive demo of claudetree workflow (no tokens used)')
  .action(async () => {
    try {
      await runDemo();
    } catch {
      // User interrupted (Ctrl+C)
      console.log(`\n${COLORS.dim}Demo interrupted.${COLORS.reset}\n`);
    }
  });
