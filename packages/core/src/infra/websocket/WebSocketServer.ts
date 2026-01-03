import { WebSocketServer as WSServer, WebSocket } from 'ws';

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
      console.log(`WebSocket client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`WebSocket client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (err) => {
      console.error('WebSocket server error:', err.message);
    });

    console.log(`WebSocket server listening on port ${port}`);
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
