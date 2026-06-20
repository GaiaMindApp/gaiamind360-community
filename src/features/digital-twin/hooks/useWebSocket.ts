/**
 * useWebSocket — GaiaMind Digital Twin Earth
 * WebSocket connection to /api/v1/digital-twin/realtime with exponential
 * backoff reconnection.
 * Requirements: 15.11 — Property 35
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL        = '/api/v1/digital-twin/realtime';
const MAX_RETRIES   = 5;

/**
 * Compute reconnection delay for attempt n in [1, 5].
 * Property 35: delay = 2^(n-1) seconds → [1, 2, 4, 8, 16].
 */
export function getBackoffDelay(n: number): number {
  const clamped = Math.min(Math.max(n, 1), MAX_RETRIES);
  return Math.pow(2, clamped - 1);
}

export interface WebSocketHookResult<T> {
  lastMessage: T | null;
  lastUpdated: Date | null;
  connected: boolean;
  retryCount: number;
  status: 'connecting' | 'open' | 'closed' | 'error';
}

export function useWebSocket<T = unknown>(): WebSocketHookResult<T> {
  const wsRef       = useRef<WebSocket | null>(null);
  const retryRef    = useRef(0);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef  = useRef(true);

  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected,   setConnected]   = useState(false);
  const [retryCount,  setRetryCount]  = useState(0);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');

  const getToken = (): string => localStorage.getItem('auth_token') ?? '';

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Build WS URL with auth token as query param (standard pattern)
    const token  = getToken();
    const wsBase = window.location.origin.replace(/^http/, 'ws');
    const url    = `${wsBase}${WS_URL}${token ? `?token=${token}` : ''}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retryRef.current = 0;
      setConnected(true);
      setRetryCount(0);
      setStatus('open');
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as T;
        setLastMessage(data);
        setLastUpdated(new Date());
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus('error');
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      setStatus('closed');

      if (retryRef.current < MAX_RETRIES) {
        retryRef.current += 1;
        const delaySec = getBackoffDelay(retryRef.current);
        setRetryCount(retryRef.current);
        timeoutRef.current = setTimeout(connect, delaySec * 1000);
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [connect]);

  return { lastMessage, lastUpdated, connected, retryCount, status };
}
