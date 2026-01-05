'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  retryCount: number;
  lastError: string | null;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    maxRetries = 10,
    baseDelay = 1000,
    maxDelay = 30000,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      return delay + Math.random() * delay * 0.1;
    },
    [baseDelay, maxDelay]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        setRetryCount(0);
        retryCountRef.current = 0;
        setLastError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        setConnectionState('disconnected');
        wsRef.current = null;

        if (event.code === 1000 || retryCountRef.current >= maxRetries) {
          if (retryCountRef.current >= maxRetries) {
            setLastError(`Max retries (${maxRetries}) exceeded`);
          }
          return;
        }

        const delay = calculateDelay(retryCountRef.current);
        timeoutRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          setRetryCount(retryCountRef.current);
          connect();
        }, delay);
      };

      ws.onerror = () => {
        setLastError('WebSocket connection error');
      };
    } catch (err) {
      setConnectionState('disconnected');
      setLastError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [url, onMessage, maxRetries, calculateDelay]);

  const reconnect = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    wsRef.current?.close(1000);
    wsRef.current = null;
    retryCountRef.current = 0;
    setRetryCount(0);
    setLastError(null);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      wsRef.current?.close(1000);
    };
  }, [connect]);

  return { connectionState, retryCount, lastError, reconnect };
}
