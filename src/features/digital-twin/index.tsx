/**
 * GaiaMind Digital Twin Earth — Feature Root
 * Fly-to: double-click globe OR search bar
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DigitalTwinCanvas } from './engine/DigitalTwinCanvas';
import { TimeMachine } from './layers/TimeMachine';
import { TsiHeatmapLayer } from './layers/TsiHeatmapLayer';
import { CapitalsLayer } from './layers/CapitalsLayer';
import { CountryPanel } from './panels/CountryPanel';
import { digitalTwinStore } from './store/digitalTwinStore';

// ── Preset regions ────────────────────────────────────────────────────────────
const PRESETS: Record<string, { lon: number; lat: number; alt: number }> = {
  'World':          { lon:   0, lat:  15, alt: 12_000_000 },
  'Africa':         { lon:  20, lat:   0, alt:  6_000_000 },
  'Europe':         { lon:  15, lat:  52, alt:  3_000_000 },
  'North America':  { lon: -95, lat:  45, alt:  5_000_000 },
  'South America':  { lon: -58, lat: -15, alt:  6_000_000 },
  'Asia':           { lon:  90, lat:  35, alt:  7_000_000 },
  'Oceania':        { lon: 135, lat: -25, alt:  5_000_000 },
  'Angola':         { lon:  18, lat: -12, alt:    800_000 },
  'USA':            { lon: -98, lat:  38, alt:  4_000_000 },
  'China':          { lon: 105, lat:  35, alt:  4_000_000 },
  'Brazil':         { lon: -51, lat: -14, alt:  4_000_000 },
  'Portugal':       { lon:  -8, lat:  39, alt:    500_000 },
};

function flyTo(dest: { lon: number; lat: number; alt: number }) {
  const viewer = (window as any).__cesiumViewer;
  if (!viewer || viewer.isDestroyed()) return;
  const C = (window as any).Cesium;
  viewer.camera.flyTo({
    destination: C.Cartesian3.fromDegrees(dest.lon, dest.lat, dest.alt),
    duration: 2,
  });
}

// ── Search bar component ──────────────────────────────────────────────────────
function GlobeSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const onChange = (v: string) => {
    setQuery(v);
    if (!v.trim()) { setSuggestions([]); return; }
    const q = v.toLowerCase();
    setSuggestions(Object.keys(PRESETS).filter(k => k.toLowerCase().includes(q)));
  };

  const select = (name: string) => {
    setQuery(name);
    setSuggestions([]);
    flyTo(PRESETS[name]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = Object.keys(PRESETS).find(k => k.toLowerCase() === query.toLowerCase());
    if (match) select(match);
  };

  return (
    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: 'clamp(200px, 40%, 320px)' }}>
      <form onSubmit={submit} style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder={t('dte.copilot_placeholder', '🔍 País…')}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(8,12,28,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8,
            color: '#fff', fontSize: 12, padding: '6px 12px',
            outline: 'none',
          }}
        />
      </form>
      {suggestions.length > 0 && (
        <div style={{
          marginTop: 2, background: 'rgba(8,12,28,0.95)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <div
              key={s}
              onClick={() => select(s)}
              style={{
                padding: '6px 12px', fontSize: 12, color: '#fff', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ── Main component ────────────────────────────────────────────────────────────
export default function DigitalTwinEarth(): React.ReactElement {
  const { t } = useTranslation();
  const [year, setYear] = useState(digitalTwinStore.getState().selectedYear);

  useEffect(() => digitalTwinStore.subscribe(() => {
    setYear(digitalTwinStore.getState().selectedYear);
  }), []);

  const zoom = (factor: number) => {
    const viewer = (window as any).__cesiumViewer;
    if (!viewer || viewer.isDestroyed()) return;
    try {
      const h = viewer.scene.camera.positionCartographic.height;
      if (!h) return;
      viewer.scene.camera.zoomIn(h * factor);
    } catch { /* scene not ready */ }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000814', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <DigitalTwinCanvas />
      </div>

      {/* Year badge */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 100,
        background: 'rgba(0,8,20,0.7)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6, padding: '3px 10px',
        color: 'rgba(255,255,255,0.7)', fontSize: 11,
        pointerEvents: 'none',
      }}>
        🌍 {t('dte.title')} · {year}
      </div>

      {/* Search bar — top centre */}
      <GlobeSearch />

      {/* Zoom buttons — right side, vertically centred */}
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        zIndex: 300, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <button onClick={() => zoom(0.5)}  aria-label={t('dte.zoom_in', 'Zoom in')}  style={zoomBtnStyle}>+</button>
        <button onClick={() => zoom(-0.7)} aria-label={t('dte.zoom_out', 'Zoom out')} style={zoomBtnStyle}>−</button>
      </div>

      {/* Time Machine */}
      <TimeMachine />

      {/* TSI Heatmap (renders nothing, just attaches Cesium datasource) */}
      <TsiHeatmapLayer />

      {/* Capital pins — aparecem ao fazer zoom */}
      <CapitalsLayer />

      {/* Country detail panel (shows on country click) */}
      <CountryPanel />
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  width: 32, height: 32,
  background: 'rgba(8,12,28,0.82)', backdropFilter: 'blur(6px)',
  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6,
  color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  userSelect: 'none',
};
