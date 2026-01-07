import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { createLogger } from '../logger/index.js';

const logger = createLogger('websocket');

export type EventType =
  | 'session:started'
  | 'session:updated'
  | 'session:stopped'
  | 'session:output'
  | 'worktree:created'
  | 'worktree:deleted'
  | 'event:created'
  | 'approval:requested'
  | 'approval:resolved'
  | 'review:requested'
  | 'review:resolved';

export interface WSMessage {
  type: EventType;
  payload: unknown;
  timestamp: Date;
}

export class WebSocketBroadcaster {
  private wss: WSServer;
  private clients = new Set<WebSocket>();

  constructor(port: number) {
    this.wss = new WSServer({ port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.info('client connected (%d total)', this.clients.size);

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('client disconnected (%d total)', this.clients.size);
      });

      ws.on('error', (err) => {
        logger.error('client error: %s', err.message);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (err) => {
      logger.error('server error: %s', err.message);
    });

    logger.info('server listening on port %d', port);
  }

  broadcast(message: WSMessage): void {
    const data = JSON.stringify({
      ...message,
      timestamp: message.timestamp.toISOString(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.wss.close();
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
