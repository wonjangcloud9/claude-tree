import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketBroadcaster, type WSMessage, type EventType } from './WebSocketServer.js';

describe('WebSocketBroadcaster', () => {
  let broadcaster: WebSocketBroadcaster;
  let testPort: number;

  const getAvailablePort = (): number => {
    return 9000 + Math.floor(Math.random() * 1000);
  };

  const waitForConnection = (ws: WebSocket): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
  };

  const waitForMessage = (ws: WebSocket): Promise<string> => {
    return new Promise((resolve, reject) => {
      ws.once('message', (data) => resolve(data.toString()));
      ws.once('error', reject);
    });
  };

  const waitForClose = (ws: WebSocket): Promise<void> => {
    return new Promise((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      ws.once('close', () => resolve());
    });
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    testPort = getAvailablePort();
  });

  afterEach(async () => {
    if (broadcaster) {
      broadcaster.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a WebSocket server on the specified port', () => {
      broadcaster = new WebSocketBroadcaster(testPort);

      expect(broadcaster).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        `WebSocket server listening on port ${testPort}`
      );
    });

    it('should start with zero clients', () => {
      broadcaster = new WebSocketBroadcaster(testPort);

      expect(broadcaster.clientCount).toBe(0);
    });
  });

  describe('client connection', () => {
    it('should track connected clients', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      expect(broadcaster.clientCount).toBe(1);

      client.close();
      await waitForClose(client);
    });

    it('should handle multiple client connections', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client1 = new WebSocket(`ws://localhost:${testPort}`);
      const client2 = new WebSocket(`ws://localhost:${testPort}`);
      const client3 = new WebSocket(`ws://localhost:${testPort}`);

      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2),
        waitForConnection(client3),
      ]);

      expect(broadcaster.clientCount).toBe(3);

      client1.close();
      client2.close();
      client3.close();
      await Promise.all([
        waitForClose(client1),
        waitForClose(client2),
        waitForClose(client3),
      ]);
    });

    it('should log client connection', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      expect(console.log).toHaveBeenCalledWith(
        'WebSocket client connected (1 total)'
      );

      client.close();
      await waitForClose(client);
    });
  });

  describe('client disconnection', () => {
    it('should remove client on close', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      expect(broadcaster.clientCount).toBe(1);

      client.close();
      await waitForClose(client);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(broadcaster.clientCount).toBe(0);
    });

    it('should log client disconnection', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      client.close();
      await waitForClose(client);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(console.log).toHaveBeenCalledWith(
        'WebSocket client disconnected (0 total)'
      );
    });
  });

  describe('broadcast', () => {
    it('should send message to connected client', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      const messagePromise = waitForMessage(client);
      const testMessage: WSMessage = {
        type: 'session:started',
        payload: { sessionId: 'test-123' },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };
      broadcaster.broadcast(testMessage);

      const received = await messagePromise;
      const parsed = JSON.parse(received);

      expect(parsed.type).toBe('session:started');
      expect(parsed.payload).toEqual({ sessionId: 'test-123' });
      expect(parsed.timestamp).toBe('2024-01-01T00:00:00.000Z');

      client.close();
      await waitForClose(client);
    });

    it('should broadcast to all connected clients', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client1 = new WebSocket(`ws://localhost:${testPort}`);
      const client2 = new WebSocket(`ws://localhost:${testPort}`);

      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2),
      ]);

      const messagePromise1 = waitForMessage(client1);
      const messagePromise2 = waitForMessage(client2);

      const testMessage: WSMessage = {
        type: 'worktree:created',
        payload: { path: '/test/worktree' },
        timestamp: new Date('2024-01-01T12:00:00.000Z'),
      };
      broadcaster.broadcast(testMessage);

      const [received1, received2] = await Promise.all([
        messagePromise1,
        messagePromise2,
      ]);

      expect(JSON.parse(received1).type).toBe('worktree:created');
      expect(JSON.parse(received2).type).toBe('worktree:created');

      client1.close();
      client2.close();
      await Promise.all([waitForClose(client1), waitForClose(client2)]);
    });

    it('should not fail when no clients are connected', () => {
      broadcaster = new WebSocketBroadcaster(testPort);

      const testMessage: WSMessage = {
        type: 'session:stopped',
        payload: {},
        timestamp: new Date(),
      };

      expect(() => broadcaster.broadcast(testMessage)).not.toThrow();
    });

    it('should handle various event types', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client);

      // Test a representative subset to avoid MaxListeners warning
      const eventTypes: EventType[] = [
        'session:started',
        'worktree:created',
        'approval:requested',
      ];

      for (const eventType of eventTypes) {
        const messagePromise = waitForMessage(client);
        const testMessage: WSMessage = {
          type: eventType,
          payload: { test: true },
          timestamp: new Date(),
        };
        broadcaster.broadcast(testMessage);

        const received = await messagePromise;
        const parsed = JSON.parse(received);
        expect(parsed.type).toBe(eventType);
      }

      client.close();
      await waitForClose(client);
    });
  });

  describe('error handling', () => {
    it('should handle server error event gracefully', () => {
      broadcaster = new WebSocketBroadcaster(testPort);

      // Server should not crash when error event is emitted
      // In real scenarios, server errors occur on port conflicts, etc.
      expect(() => {
        // Access internal wss for testing error handler
        const wss = (broadcaster as unknown as { wss: { emit: (event: string, err: Error) => void } }).wss;
        wss.emit('error', new Error('Server error'));
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'WebSocket server error:',
        'Server error'
      );
    });

    it('should skip closed clients during broadcast', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client1 = new WebSocket(`ws://localhost:${testPort}`);
      const client2 = new WebSocket(`ws://localhost:${testPort}`);

      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2),
      ]);

      // Close one client
      client1.close();
      await waitForClose(client1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Broadcast should only reach client2
      const messagePromise = waitForMessage(client2);
      const testMessage: WSMessage = {
        type: 'session:started',
        payload: {},
        timestamp: new Date(),
      };
      broadcaster.broadcast(testMessage);

      const received = await messagePromise;
      expect(JSON.parse(received).type).toBe('session:started');

      client2.close();
      await waitForClose(client2);
    });
  });

  describe('close', () => {
    it('should close all client connections', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      const client1 = new WebSocket(`ws://localhost:${testPort}`);
      const client2 = new WebSocket(`ws://localhost:${testPort}`);

      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2),
      ]);

      expect(broadcaster.clientCount).toBe(2);

      const closePromise1 = waitForClose(client1);
      const closePromise2 = waitForClose(client2);

      broadcaster.close();

      await Promise.all([closePromise1, closePromise2]);

      expect(client1.readyState).toBe(WebSocket.CLOSED);
      expect(client2.readyState).toBe(WebSocket.CLOSED);
    });

    it('should not accept new connections after close', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);
      broadcaster.close();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = new WebSocket(`ws://localhost:${testPort}`);

      await expect(
        new Promise<void>((resolve, reject) => {
          client.on('open', () => reject(new Error('Should not connect')));
          client.on('error', () => resolve());
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('clientCount', () => {
    it('should return current number of connected clients', async () => {
      broadcaster = new WebSocketBroadcaster(testPort);

      expect(broadcaster.clientCount).toBe(0);

      const client1 = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client1);
      expect(broadcaster.clientCount).toBe(1);

      const client2 = new WebSocket(`ws://localhost:${testPort}`);
      await waitForConnection(client2);
      expect(broadcaster.clientCount).toBe(2);

      client1.close();
      await waitForClose(client1);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(broadcaster.clientCount).toBe(1);

      client2.close();
      await waitForClose(client2);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(broadcaster.clientCount).toBe(0);
    });
  });
});
