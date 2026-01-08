import { Command } from 'commander';
import { join } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import { WebSocketBroadcaster } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

interface WebOptions {
  port: string;
  wsPort: string;
}

export const webCommand = new Command('web')
  .description('Start web dashboard')
  .option('-p, --port <port>', 'Web server port', '3000')
  .option('--ws-port <port>', 'WebSocket server port', '3001')
  .action(async (options: WebOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const port = parseInt(options.port, 10);
    const wsPort = parseInt(options.wsPort, 10);

    console.log('Starting claudetree dashboard...\n');

    // Start WebSocket server
    const wss = new WebSocketBroadcaster(wsPort);
    console.log(`  WebSocket: ws://localhost:${wsPort}`);

    // Watch sessions.json for changes and broadcast updates
    const sessionsPath = join(configDir, 'sessions.json');
    const eventsDir = join(configDir, 'events');
    let lastSessionsContent = '';
    let sessionFileWatcher: FSWatcher | null = null;
    let eventsWatcher: FSWatcher | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    let eventsDebounceTimer: NodeJS.Timeout | null = null;

    // Track last event count per session for incremental updates
    const lastEventCounts = new Map<string, number>();

    const broadcastSessionUpdate = async () => {
      try {
        const content = await readFile(sessionsPath, 'utf-8');
        if (content !== lastSessionsContent) {
          lastSessionsContent = content;
          const sessions = JSON.parse(content);
          wss.broadcast({
            type: 'session:updated',
            payload: { sessions },
            timestamp: new Date(),
          });
        }
      } catch {
        // File might not exist yet or be temporarily unavailable
      }
    };

    // Broadcast new events only (incremental)
    const broadcastNewEvents = async (sessionId: string) => {
      try {
        const eventPath = join(eventsDir, `${sessionId}.json`);
        const content = await readFile(eventPath, 'utf-8');
        const events = JSON.parse(content);
        const lastCount = lastEventCounts.get(sessionId) || 0;

        if (events.length > lastCount) {
          const newEvents = events.slice(lastCount);
          lastEventCounts.set(sessionId, events.length);

          // Broadcast each new event for live streaming effect
          for (const event of newEvents) {
            wss.broadcast({
              type: 'event:created',
              payload: { sessionId, event },
              timestamp: new Date(),
            });
          }
        }
      } catch {
        // Events file might not exist yet
      }
    };

    // Initial read
    await broadcastSessionUpdate();

    // Watch sessions.json for changes
    try {
      sessionFileWatcher = watch(sessionsPath, { persistent: true }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(broadcastSessionUpdate, 100);
      });
    } catch {
      sessionFileWatcher = watch(configDir, { persistent: true }, (_, filename) => {
        if (filename === 'sessions.json') {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(broadcastSessionUpdate, 100);
        }
      });
    }

    // Watch events directory for live streaming
    try {
      await access(eventsDir);
      eventsWatcher = watch(eventsDir, { persistent: true }, (_, filename) => {
        if (filename?.endsWith('.json')) {
          const sessionId = filename.replace('.json', '');
          if (eventsDebounceTimer) clearTimeout(eventsDebounceTimer);
          eventsDebounceTimer = setTimeout(() => broadcastNewEvents(sessionId), 50);
        }
      });
    } catch {
      // Events directory might not exist yet - will be created when first session starts
    }

    // Start Next.js dev server
    const webPath = join(cwd, 'node_modules', '@claudetree', 'web');

    // For development, use the packages/web directly
    const devWebPath = join(cwd, 'packages', 'web');

    let webDir: string;
    try {
      await access(devWebPath);
      webDir = devWebPath;
    } catch {
      webDir = webPath;
    }

    console.log(`  Web UI: http://localhost:${port}`);
    console.log('\nPress Ctrl+C to stop.\n');

    const nextProcess = spawn('npx', ['next', 'dev', '-p', String(port)], {
      cwd: webDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        CLAUDETREE_ROOT: cwd,
        CLAUDETREE_WS_PORT: String(wsPort),
      },
    });

    // Handle cleanup
    const cleanup = () => {
      console.log('\nShutting down...');
      if (debounceTimer) clearTimeout(debounceTimer);
      if (eventsDebounceTimer) clearTimeout(eventsDebounceTimer);
      if (sessionFileWatcher) sessionFileWatcher.close();
      if (eventsWatcher) eventsWatcher.close();
      wss.close();
      nextProcess.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    nextProcess.on('error', (err) => {
      console.error('Failed to start web server:', err.message);
      wss.close();
      process.exit(1);
    });
  });
