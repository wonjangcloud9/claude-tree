const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export function exitWithError(message: string, hint?: string): never {
  console.error(`${RED}Error:${RESET} ${message}`);
  if (hint) {
    console.error(`  ${YELLOW}→${RESET} ${hint}`);
  }
  process.exit(1);
}

export function exitNotInitialized(): never {
  exitWithError(
    'claudetree not initialized in this directory.',
    'Run: ct init',
  );
}

export function exitSessionNotFound(query: string): never {
  exitWithError(
    `No session found matching "${query}".`,
    'Run: ct status  to see all sessions',
  );
}

export function exitNoSessions(): never {
  exitWithError(
    'No active sessions found.',
    'Run: ct start <issue-url>  to start a session',
  );
}

export function warnAndContinue(message: string): void {
  console.warn(`  ${DIM}⚠ ${message}${RESET}`);
}
