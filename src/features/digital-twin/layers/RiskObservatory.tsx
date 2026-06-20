/**
 * RiskObservatory — GaiaMind Digital Twin Earth
 * Risk dimension overlays with CSS pulsing animations.
 * Requirements: 7.1–7.7 — Properties 11, 12
 */
import React, { useMemo } from 'react';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import { useRiskLayer } from '../hooks/useDigitalTwinAPI';
import type { RiskDimension } from '../types/digitalTwin.types';

const RISK_DIMENSIONS: RiskDimension[] = [
  'climate_risk',
  'water_stress',
  'food_insecurity',
  'political_instability',
  'economic_vulnerability',
  'biodiversity_loss',
  'deforestation_risk',
];

const DIMENSION_COLORS: Record<RiskDimension, string> = {
  climate_risk:            '#ef4444',
  water_stress:            '#3b82f6',
  food_insecurity:         '#f59e0b',
  political_instability:   '#8b5cf6',
  economic_vulnerability:  '#ec4899',
  biodiversity_loss:       '#22c55e',
  deforestation_risk:      '#84cc16',
};

const DIMENSION_LABELS: Record<RiskDimension, string> = {
  climate_risk:            'Climate Risk',
  water_stress:            'Water Stress',
  food_insecurity:         'Food Insecurity',
  political_instability:   'Political Instability',
  economic_vulnerability:  'Economic Vulnerability',
  biodiversity_loss:       'Biodiversity Loss',
  deforestation_risk:      'Deforestation Risk',
};

/** Property 11: pulse frequency from composite risk score */
export function getPulseFrequency(score: number): number {
  if (score > 70) return 1.0;
  if (score >= 40) return 0.5;
  return 0;
}

/** Top-N countries by composite risk score — Property 13 */
export function getTopN<T extends { composite: number }>(
  countries: T[],
  n: number
): T[] {
  return [...countries].sort((a, b) => b.composite - a.composite).slice(0, n);
}

// ── Global Risk Summary Widget ─────────────────────────────────────────────
function RiskSummaryWidget(): React.ReactElement {
  const { data: profiles } = useRiskLayer();
  const activeDims = useDigitalTwinStore((s) => s.activeRiskDimensions) as RiskDimension[];
  const primaryDim = activeDims[activeDims.length - 1] as RiskDimension | undefined;

  const top5 = useMemo(() => {
    if (!profiles || !primaryDim) return [];
    return getTopN(
      profiles.map((p) => ({
        ...p,
        composite: p.dimensions[primaryDim] ?? 0,
      })),
      5
    );
  }, [profiles, primaryDim]);

  if (!primaryDim || top5.length === 0) return <></>;

  return (
    <div
      role="region"
      aria-label="Global risk summary — top 5 countries"
      style={{
        position: 'fixed',
        top: 80,
        right: 16,
        background: 'rgba(10,15,30,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '12px 16px',
        color: '#fff',
        fontSize: 12,
        fontFamily: '"Google Sans", sans-serif',
        zIndex: 8600,
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, opacity: 0.7 }}>
        Top risk: {DIMENSION_LABELS[primaryDim]}
      </div>
      {top5.map((c, i) => (
        <div key={c.iso3} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>{i + 1}. {c.iso3}</span>
          <span style={{ color: '#ef4444' }}>{c.composite.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Dimension toggle controls ─────────────────────────────────────────────────
function RiskDimensionControls(): React.ReactElement {
  const activeDims   = useDigitalTwinStore((s) => s.activeRiskDimensions) as RiskDimension[];
  const activateDim  = digitalTwinStore.activateRiskDimension;
  const activeLayers = useDigitalTwinStore((s) => s.activeLayers);
  const isVisible    = activeLayers.has('risk');

  if (!isVisible) return <></>;

  return (
    <div
      role="group"
      aria-label="Risk dimension toggles"
      style={{
        position: 'fixed',
        top: 80,
        left: 16,
        background: 'rgba(10,15,30,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '12px',
        color: '#fff',
        fontSize: 12,
        fontFamily: '"Google Sans", sans-serif',
        zIndex: 8600,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
        Risk Dimensions (max 3)
      </div>
      {RISK_DIMENSIONS.map((dim) => {
        const isActive = activeDims.includes(dim);
        return (
          <button
            key={dim}
            onClick={() => activateDim(dim)}
            aria-pressed={isActive}
            aria-label={`Toggle ${DIMENSION_LABELS[dim]} risk dimension`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: isActive ? `${DIMENSION_COLORS[dim]}22` : 'transparent',
              border: `1px solid ${isActive ? DIMENSION_COLORS[dim] : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              color: '#fff',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 11,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: DIMENSION_COLORS[dim],
              }}
            />
            {DIMENSION_LABELS[dim]}
          </button>
        );
      })}
    </div>
  );
}

export function RiskObservatory(): React.ReactElement {
  const activeLayers = useDigitalTwinStore((s) => s.activeLayers);
  const isVisible    = activeLayers.has('risk');

  if (!isVisible) return <></>;

  return (
    <>
      <RiskDimensionControls />
      <RiskSummaryWidget />
    </>
  );
}

export default RiskObservatory;
