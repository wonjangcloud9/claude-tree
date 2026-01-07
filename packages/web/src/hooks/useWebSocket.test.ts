/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket class
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    mockInstances.push(this);
  }

  close(code?: number) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code ?? 1000 } as CloseEvent);
    }
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code } as CloseEvent);
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
}

let mockInstances: MockWebSocket[] = [];

// Replace global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket);

describe('useWebSocket', () => {
  beforeEach(() => {
    mockInstances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('connection state management', () => {
    it('should start in disconnected state', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001' })
      );

      // Initially disconnected, then immediately connecting
      expect(['disconnected', 'connecting']).toContain(
        result.current.connectionState
      );
    });

    it('should transition to connected state on successful connection', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001' })
      );

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.lastError).toBeNull();
    });

    it('should set error state on connection failure', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001' })
      );

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateError();
      });

      expect(result.current.lastError).toBe('WebSocket connection error');
    });

    it('should transition to disconnected state on close', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001' })
      );

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateClose(1000);
      });

      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('reconnection logic', () => {
    it('should attempt reconnection on unexpected close', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:3001',
          baseDelay: 1000,
          maxRetries: 3,
        })
      );

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateOpen();
      });

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateClose(1006); // Abnormal close
      });

      // Should schedule retry
      expect(result.current.connectionState).toBe('disconnected');

      await act(async () => {
        vi.advanceTimersByTime(1500); // Wait for retry
      });

      expect(result.current.retryCount).toBe(1);
    });

    it('should not reconnect on clean close (code 1000)', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001', maxRetries: 3 })
      );

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateOpen();
      });

      await act(async () => {
        const ws = mockInstances[0];
        ws.simulateClose(1000); // Clean close
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.retryCount).toBe(0);
    });

    it('should stop retrying after max retries', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:3001',
          maxRetries: 2,
          baseDelay: 100,
        })
      );

      // First connection attempt fails
      await act(async () => {
        mockInstances[0].simulateClose(1006);
      });

      // Retry 1
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      await act(async () => {
        mockInstances[mockInstances.length - 1].simulateClose(1006);
      });

      // Retry 2
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      await act(async () => {
        mockInstances[mockInstances.length - 1].simulateClose(1006);
      });

      // Should stop at max retries
      expect(result.current.lastError).toContain('Max retries');
    });
  });

  describe('manual reconnect', () => {
    it('should provide reconnect function', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001' })
      );

      await act(async () => {
        mockInstances[0].simulateOpen();
      });

      await act(async () => {
        mockInstances[0].simulateClose(1006);
      });

      const instancesBefore = mockInstances.length;

      await act(async () => {
        result.current.reconnect();
      });

      // Should create new connection
      expect(mockInstances.length).toBeGreaterThan(instancesBefore);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('message handling', () => {
    it('should call onMessage callback with parsed data', async () => {
      const { useWebSocket } = await import('./useWebSocket.js');
      const { renderHook, act } = await import('@testing-library/react');

      const onMessage = vi.fn();
      renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001', onMessage })
      );

      await act(async () => {
        mockInstances[0].simulateOpen();
      });

      await act(async () => {
        mockInstances[0].simulateMessage({ type: 'test', data: 'hello' });
      });

      expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
    });
  });
});
