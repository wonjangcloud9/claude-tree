import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileEventRepository, FileSessionRepository } from '@claudetree/core';
import type { EventType, SessionEvent } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const TYPE_STYLES: Record<EventType, { icon: string; color: string }> = {
  output: { icon: '>', color: '\x1b[37m' },
  file_change: { icon: 'F', color: '\x1b[33m' },
  commit: { icon: 'C', color: '\x1b[32m' },
  test_run: { icon: 'T', color: '\x1b[36m' },
  tool_call: { icon: '*', color: '\x1b[35m' },
  error: { icon: '!', color: '\x1b[31m' },
  milestone: { icon: '#', color: '\x1b[34m' },
};

function formatEvent(event: SessionEvent): string {
  const style = TYPE_STYLES[event.type] ?? { icon: '?', color: '' };
  const time = event.timestamp.toLocaleTimeString();
  const icon = `${style.color}${style.icon}${RESET}`;
  const content = event.content.length > 200
    ? event.content.slice(0, 200) + '...'
    : event.content;

  return `${DIM}${time}${RESET} ${icon} ${content}`;
}

interface LogOptions {
  lines: string;
  type?: string;
  json: boolean;
  follow: boolean;
}

async function findSessionId(
  sessionRepo: FileSessionRepository,
  query: string,
): Promise<string | null> {
  const sessions = await sessionRepo.findAll();

  // Match by session ID prefix
  const byId = sessions.find((s) => s.id.startsWith(query));
  if (byId) return byId.id;

  // Match by issue number
  const issueNum = Number(query);
  if (!isNaN(issueNum)) {
    const byIssue = sessions.find((s) => s.issueNumber === issueNum);
    if (byIssue) return byIssue.id;
  }

  return null;
}

export const logCommand = new Command('log')
  .description('View session events and output log')
  .argument('<session>', 'Session ID (prefix) or issue number')
  .option('-n, --lines <count>', 'Number of recent events to show', '50')
  .option('-t, --type <type>', 'Filter by event type (output,error,commit,...)')
  .option('--json', 'Output as JSON', false)
  .option('-f, --follow', 'Follow mode: watch for new events', false)
  .action(async (session: string, options: LogOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "ct init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const eventRepo = new FileEventRepository(configDir);

    const sessionId = await findSessionId(sessionRepo, session);
    if (!sessionId) {
      console.error(`Error: No session found matching "${session}".`);
      console.error('Use "ct status" to see available sessions.');
      process.exit(1);
    }

    const limit = parseInt(options.lines, 10) || 50;
    const typeFilter = options.type as EventType | undefined;

    const displayEvents = async () => {
      let events = await eventRepo.getLatest(sessionId, limit * 2);

      if (typeFilter) {
        events = events.filter((e) => e.type === typeFilter);
      }
      events = events.slice(-limit);

      if (options.json) {
        console.log(JSON.stringify(events, null, 2));
        return events.length;
      }

      if (events.length === 0) {
        console.log(`${DIM}No events found for session ${sessionId.slice(0, 8)}.${RESET}`);
        return 0;
      }

      console.log(`${BOLD}Session ${sessionId.slice(0, 8)} - ${events.length} events${RESET}\n`);

      for (const event of events) {
        console.log(formatEvent(event));
      }
      return events.length;
    };

    if (options.follow) {
      let lastCount = 0;
      console.log(`${DIM}Following session ${sessionId.slice(0, 8)}... (Ctrl+C to exit)${RESET}\n`);

      const interval = setInterval(async () => {
        let events = await eventRepo.getLatest(sessionId, limit * 2);
        if (typeFilter) {
          events = events.filter((e) => e.type === typeFilter);
        }

        if (events.length > lastCount) {
          const newEvents = events.slice(lastCount);
          for (const event of newEvents) {
            console.log(formatEvent(event));
          }
          lastCount = events.length;
        }
      }, 1000);

      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });

      await displayEvents();
      lastCount = (await eventRepo.getLatest(sessionId, limit * 2)).length;
    } else {
      await displayEvents();
    }
  });
