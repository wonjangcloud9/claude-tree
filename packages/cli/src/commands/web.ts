import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
