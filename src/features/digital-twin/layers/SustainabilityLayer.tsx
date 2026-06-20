/**
 * SustainabilityLayer — GaiaMind Digital Twin Earth
 * Choropleth overlay using CIELAB colour scale per country GaiaMind score.
 * Requirements: 4.1–4.7
 */
import React, { useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useLayer } from '../hooks/useDigitalTwinAPI';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { getScoreColourZone, getAccessibilityPattern } from '../engine/shaders/choropleth.glsl';
import type { GaiaMindScore, SubScoreKey } from '../types/digitalTwin.types';

// CIELAB-approximate hex values matching choropleth.glsl
const COLOR_RED    = '#d93820';
const COLOR_YELLOW = '#F5E900';
const COLOR_GREEN  = '#0F9E59';
const COLOR_GREY   = '#9E9E9E';

/** Interpolate between two hex colours by t in [0,1] */
function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const ca = parse(a), cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bv = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
}

/** Map a score [0–100] to a hex colour following the CIELAB scale (Req 4.2) */
export function scoreToColor(score: number): string {
  if (score <= 30) {
    return lerpHex(COLOR_RED, COLOR_YELLOW, score / 30);
  }
  if (score <= 60) {
    return lerpHex(COLOR_YELLOW, COLOR_GREEN, (score - 30) / 30);
  }
  return lerpHex(COLOR_GREEN, '#00ff88', (score - 60) / 40);
}

// Sub-score weights (Req 4.1)
export const SCORE_WEIGHTS: Record<SubScoreKey, number> = {
  environmental:     0.20,
  social:            0.20,
  economic:          0.20,
  governance:        0.15,
  climate_resilience: 0.15,
  digital_development: 0.10,
};

/** Compute composite GaiaMind score from six sub-scores (Property 5) */
export function computeCompositeScore(
  subScores: Record<SubScoreKey, number>
): number {
  return (
    SCORE_WEIGHTS.environmental     * subScores.environmental     +
    SCORE_WEIGHTS.social            * subScores.social            +
    SCORE_WEIGHTS.economic          * subScores.economic          +
    SCORE_WEIGHTS.governance        * subScores.governance        +
    SCORE_WEIGHTS.climate_resilience * subScores.climate_resilience +
    SCORE_WEIGHTS.digital_development * subScores.digital_development
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function ScoreLegend({ activeScoreName }: { activeScoreName: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Show sustainability layer legend"
          style={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            background: 'rgba(10,15,30,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          🎨 {activeScoreName} Legend
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          style={{
            background: 'rgba(10,15,30,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: 16,
            color: '#fff',
            fontSize: 12,
            fontFamily: '"Google Sans", sans-serif',
            minWidth: 220,
            zIndex: 9500,
          }}
          role="dialog"
          aria-label="Sustainability score legend"
        >
          <div style={{ marginBottom: 10, fontWeight: 600 }}>{activeScoreName}</div>
          {/* Gradient bar */}
          <div style={{
            height: 12,
            borderRadius: 6,
            background: `linear-gradient(to right, ${COLOR_RED}, ${COLOR_YELLOW}, ${COLOR_GREEN})`,
            marginBottom: 6,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7 }}>
            <span>0 (Low)</span>
            <span>30</span>
            <span>60</span>
            <span>100 (High)</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([['0–30', COLOR_RED, 'Red zone'], ['31–60', COLOR_YELLOW, 'Yellow zone'], ['61–100', COLOR_GREEN, 'Green zone']] as const).map(
              ([label, color, desc]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  <span>{label}</span>
                </div>
              )
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR_GREY }} />
              <span>No data</span>
            </div>
          </div>
          <Popover.Arrow style={{ fill: 'rgba(10,15,30,0.95)' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function SustainabilityLayer(): React.ReactElement {
  const subScore        = useDigitalTwinStore((s) => s.sustainabilitySubScore);
  const activeLayers    = useDigitalTwinStore((s) => s.activeLayers);
  const accessibilityMode = useDigitalTwinStore((s) => s.accessibilityMode);

  const isActive = activeLayers.has('sustainability');

  const { data: geoJSON, isLoading } = useLayer('sustainability');

  const activeScoreName = subScore === 'composite'
    ? 'Composite (GaiaMind_Score)'
    : subScore.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Build a map of iso3 → display colour
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!geoJSON || !isActive) return map;
    const features = (geoJSON as GeoJSON.FeatureCollection).features ?? [];
    for (const feat of features) {
      const p   = feat.properties ?? {};
      const iso3 = p.iso3 as string;
      if (!iso3) continue;
      if (p.data_available === false) {
        map.set(iso3, COLOR_GREY);
        continue;
      }
      const score = subScore === 'composite'
        ? (p.composite_score as number ?? 50)
        : (p.sub_scores?.[subScore] as number ?? 50);
      map.set(iso3, scoreToColor(score));
    }
    return map;
  }, [geoJSON, isActive, subScore]);

  if (!isActive) return <></>;

  return (
    <>
      {/* The actual WebGL fill is applied by the choropleth shader on EarthGlobe.
          This component manages the React-side legend and accessibility overlays. */}
      <ScoreLegend activeScoreName={activeScoreName} />
    </>
  );
}

export default SustainabilityLayer;
