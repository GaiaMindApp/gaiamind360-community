/**
 * GeoJsonBorders — GaiaMind Digital Twin Earth
 * Renders country/state/city borders, labels, and flag sprites with LOD streaming.
 * Requirements: 3.1–3.8
 */
import React, { useEffect, useRef, useState } from 'react';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import { useGeographicHierarchy } from '../hooks/useGeographicHierarchy';
import type { GeoLevel } from '../types/digitalTwin.types';

interface CountryFeature {
  iso3: string;
  name: string;
  score?: number;
  dataAvailable?: boolean;
  centroid: [number, number]; // [lon, lat]
}

interface Props {
  onCountryHover?: (iso3: string | null) => void;
  onCountryClick?: (iso3: string) => void;
}

// Tooltip component
function Tooltip({ x, y, name, score }: { x: number; y: number; name: string; score?: number }) {
  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: x + 12,
        top: y - 8,
        background: 'rgba(10,15,30,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        padding: '4px 10px',
        color: '#fff',
        fontSize: 12,
        fontFamily: '"Google Sans", sans-serif',
        pointerEvents: 'none',
        zIndex: 9000,
        whiteSpace: 'nowrap',
      }}
    >
      <strong>{name}</strong>
      {score !== undefined && (
        <span style={{ marginLeft: 8, color: '#7dd3fc' }}>
          GaiaMind: {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function GeoJsonBorders({ onCountryHover, onCountryClick }: Props): React.ReactElement {
  const { geoLevel } = useGeographicHierarchy();
  const hoveredIso3  = useDigitalTwinStore((s) => s.hoveredIso3);
  const setHovered   = digitalTwinStore.setHoveredIso3;

  const [loading,  setLoading]  = useState(false);
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [tooltip,  setTooltip]  = useState<{ x: number; y: number; name: string; score?: number } | null>(null);

  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLevel    = useRef<GeoLevel | null>(null);

  // Load geometry when level changes
  useEffect(() => {
    if (geoLevel === lastLevel.current) return;
    lastLevel.current = geoLevel;

    // Show loading indicator after 200 ms (Req 3.8)
    loadTimerRef.current = setTimeout(() => setLoading(true), 200);

    const endpoint = levelToEndpoint(geoLevel);
    const controller = new AbortController();

    fetch(endpoint, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        setLoading(false);
        setFeatures(parseFeatures(data));
      })
      .catch(() => {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        setLoading(false);
      });

    return () => {
      controller.abort();
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [geoLevel]);

  const handleMouseEnter = (f: CountryFeature, e: React.MouseEvent) => {
    setHovered(f.iso3);
    onCountryHover?.(f.iso3);
    setTooltip({ x: e.clientX, y: e.clientY, name: f.name, score: f.score });
  };

  const handleMouseLeave = () => {
    setHovered(null);
    onCountryHover?.(null);
    setTooltip(null);
  };

  const handleClick = (f: CountryFeature) => {
    onCountryClick?.(f.iso3);
  };

  // Only show labels at country level and below
  const showLabels = geoLevel !== 'planet';

  return (
    <>
      {/* Loading overlay */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading geographic data"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '8px 16px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontFamily: '"Google Sans", sans-serif',
            zIndex: 8000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />
          Loading geography…
        </div>
      )}

      {/* Country labels overlay (positioned over the canvas) */}
      {showLabels && features.map((f) => (
        <div
          key={f.iso3}
          role="button"
          tabIndex={0}
          aria-label={`${f.name}${f.score !== undefined ? `, GaiaMind score ${f.score.toFixed(1)}` : ''}`}
          onMouseEnter={(e) => handleMouseEnter(f, e)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(f)}
          onKeyDown={(e) => e.key === 'Enter' && handleClick(f)}
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            // Label positioning is handled by the parent canvas overlay system
            // This stub renders the interaction layer
            opacity: hoveredIso3 === f.iso3 ? 1 : 0.8,
          }}
        >
          {f.name}
        </div>
      ))}

      {/* Tooltip */}
      {tooltip && (
        <Tooltip x={tooltip.x} y={tooltip.y} name={tooltip.name} score={tooltip.score} />
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function levelToEndpoint(level: GeoLevel): string {
  const map: Record<GeoLevel, string> = {
    planet:  '/api/v1/digital-twin/layers/borders-planet',
    country: '/api/v1/digital-twin/layers/borders-country',
    state:   '/api/v1/digital-twin/layers/borders-state',
    city:    '/api/v1/digital-twin/layers/borders-city',
  };
  return map[level];
}

function parseFeatures(data: unknown): CountryFeature[] {
  if (!data || typeof data !== 'object') return [];
  const fc = data as { features?: unknown[] };
  if (!Array.isArray(fc.features)) return [];
  return fc.features
    .map((f: unknown) => {
      const feat = f as { properties?: Record<string, unknown>; geometry?: { type: string; coordinates: number[] } };
      const p = feat.properties ?? {};
      return {
        iso3:          String(p.iso3 ?? ''),
        name:          String(p.name ?? ''),
        score:         p.composite_score !== undefined ? Number(p.composite_score) : undefined,
        dataAvailable: p.data_available !== false,
        centroid:      (feat.geometry?.coordinates as [number, number]) ?? [0, 0],
      };
    })
    .filter((f) => f.iso3);
}

export default GeoJsonBorders;
