/**
 * RealTimeMonitor — GaiaMind Digital Twin Earth
 * Wildfire, cyclone, AQI, and earthquake overlays via WebSocket.
 * Requirements: 13.1–13.8 — Property 28
 */
import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import type { RealTimeEvent } from '../types/digitalTwin.types';

/** Property 28: format UTC datetime as "Last updated: YYYY-MM-DD HH:MM UTC" */
export function formatLastUpdated(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `Last updated: ${dt.getUTCFullYear()}-` +
    `${pad(dt.getUTCMonth() + 1)}-` +
    `${pad(dt.getUTCDate())} ` +
    `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())} UTC`
  );
}

type SourceType = 'wildfire' | 'cyclone' | 'aqi' | 'earthquake';
const SOURCE_LABELS: Record<SourceType, string> = {
  wildfire:   '🔥 Wildfires',
  cyclone:    '🌀 Cyclones',
  aqi:        '💨 Air Quality',
  earthquake: '🌍 Earthquakes',
};

const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface SourceState {
  lastUpdated: Date | null;
  offline: boolean;
  failCount: number;
  loading: boolean;
}

function SourceStatusBadge({
  label,
  state,
}: {
  label: string;
  state: SourceState;
}) {
  let statusText = '';
  let color = '#22c55e';

  if (state.loading) {
    statusText = 'Loading…';
    color = '#f59e0b';
  } else if (state.offline) {
    statusText = 'Source offline';
    color = '#ef4444';
  } else if (state.lastUpdated) {
    statusText = formatLastUpdated(state.lastUpdated);
    color = 'rgba(255,255,255,0.4)';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 0',
        fontSize: 11,
        fontFamily: '"Google Sans", sans-serif',
        color: '#fff',
      }}
    >
      <span>{label}</span>
      <span style={{ color, fontSize: 10, marginLeft: 12, textAlign: 'right' }}>
        {statusText}
      </span>
    </div>
  );
}

export function RealTimeMonitor(): React.ReactElement {
  const activeLayers = useDigitalTwinStore((s) => s.activeLayers);
  const visible      = activeLayers.has('realtime');

  const { lastMessage, lastUpdated, connected, status } = useWebSocket<RealTimeEvent>();

  const [sources, setSources] = useState<Record<SourceType, SourceState>>({
    wildfire:   { lastUpdated: null, offline: false, failCount: 0, loading: true },
    cyclone:    { lastUpdated: null, offline: false, failCount: 0, loading: true },
    aqi:        { lastUpdated: null, offline: false, failCount: 0, loading: true },
    earthquake: { lastUpdated: null, offline: false, failCount: 0, loading: true },
  });

  // Track last message time per source
  const lastMsgTime = useRef<Record<SourceType, number>>({
    wildfire: 0, cyclone: 0, aqi: 0, earthquake: 0,
  });

  useEffect(() => {
    if (!lastMessage || !lastUpdated) return;
    const type = lastMessage.type as SourceType;
    if (!type) return;

    lastMsgTime.current[type] = lastUpdated.getTime();

    setSources((prev) => ({
      ...prev,
      [type]: {
        lastUpdated,
        offline:   false,
        failCount: 0,
        loading:   false,
      },
    }));
  }, [lastMessage, lastUpdated]);

  // Check for sources going offline (> 30 min since last message)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSources((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(prev) as [SourceType, SourceState][]) {
          const lastT = lastMsgTime.current[key];
          if (lastT > 0 && now - lastT > OFFLINE_THRESHOLD_MS) {
            next[key] = { ...val, offline: true };
          }
        }
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Mark loading → "Source offline" after 2 consecutive failures
  useEffect(() => {
    if (!connected && status === 'error') {
      setSources((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(prev) as SourceType[]) {
          const s = prev[key];
          if (s.loading) {
            const failCount = s.failCount + 1;
            next[key] = {
              ...s,
              failCount,
              offline:  failCount >= 2,
              loading:  failCount < 2,
            };
          }
        }
        return next;
      });
    }
  }, [connected, status]);

  if (!visible) return <></>;

  return (
    <div
      role="region"
      aria-label="Real-time planetary events monitor"
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,15,30,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '10px 16px',
        color: '#fff',
        zIndex: 8700,
        minWidth: 280,
        fontFamily: '"Google Sans", sans-serif',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 6 }}>
        Real-Time Events{' '}
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            marginLeft: 4,
          }}
        />
      </div>
      {(Object.entries(SOURCE_LABELS) as [SourceType, string][]).map(([type, label]) => (
        <SourceStatusBadge key={type} label={label} state={sources[type]} />
      ))}
    </div>
  );
}

export default RealTimeMonitor;
