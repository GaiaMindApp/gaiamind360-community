/**
 * FlowEngine — GaiaMind Digital Twin Earth
 * Animated great-circle flow arcs between country centroids.
 * Requirements: 8.1–8.8 — Properties 14–18
 */
import React, { useMemo } from 'react';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import { useFlows } from '../hooks/useDigitalTwinAPI';
import type { FlowArc, FlowType } from '../types/digitalTwin.types';

// ── Colour mapping (Req 8.5) — Property 16 ────────────────────────────────────
export const FLOW_COLORS: Record<FlowType, string> = {
  migration:  '#00FFFF',
  trade:      '#FFD700',
  carbon:     '#FF8C00',
  energy:     '#ADFF2F',
  internet:   '#007FFF',
  financial:  '#FF00FF',
};

/** Property 16: exact hex colour for a flow type */
export function getFlowColour(type: FlowType): string {
  return FLOW_COLORS[type];
}

/** Property 15: arc thickness linearly interpolated in [1, 8] px */
export function computeArcThickness(magnitude: number): number {
  const clamped = Math.min(1, Math.max(0, magnitude));
  return 1 + clamped * 7; // [1, 8]
}

/** Property 14: traversal time in seconds, inversely proportional to magnitude */
export function computeParticleSpeed(magnitude: number): number {
  const clamped = Math.min(1, Math.max(0, magnitude));
  // magnitude 0 → 10s, magnitude 1 → 2s
  return 2 + (1 - clamped) * 8;
}

/** Property 17: filter arcs by selected country */
export function filterArcsByCountry(arcs: FlowArc[], iso3: string): FlowArc[] {
  return arcs.filter((a) => a.origin_iso3 === iso3 || a.destination_iso3 === iso3);
}

/** Property 18: cull arcs to max 500 by removing lowest-magnitude first */
export function cullArcs(arcs: FlowArc[], maxCount = 500): FlowArc[] {
  if (arcs.length <= maxCount) return arcs;
  const sorted = [...arcs].sort((a, b) => a.magnitude - b.magnitude);
  return sorted.slice(arcs.length - maxCount);
}

// ── Flow type toggle controls ─────────────────────────────────────────────────
const FLOW_TYPES: FlowType[] = ['migration', 'trade', 'carbon', 'energy', 'internet', 'financial'];
const FLOW_LABELS: Record<FlowType, string> = {
  migration: 'Migration',
  trade:     'Trade',
  carbon:    'Carbon',
  energy:    'Energy',
  internet:  'Internet',
  financial: 'Financial',
};

function FlowControls(): React.ReactElement {
  const activeFlowTypes = useDigitalTwinStore((s) => s.activeFlowTypes);
  const toggleFlow      = digitalTwinStore.toggleFlowType;
  const activeLayers    = useDigitalTwinStore((s) => s.activeLayers);
  const visible         = activeLayers.has('flows');

  if (!visible) return <></>;

  return (
    <div
      role="group"
      aria-label="Flow type toggles"
      style={{
        position: 'fixed',
        bottom: 100,
        right: 16,
        background: 'rgba(10,15,30,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: 12,
        zIndex: 8600,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: '"Google Sans", sans-serif',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 4, fontWeight: 600 }}>
        Global Flows
      </div>
      {FLOW_TYPES.map((type) => {
        const isOn = activeFlowTypes.has(type);
        const color = FLOW_COLORS[type];
        return (
          <button
            key={type}
            onClick={() => toggleFlow(type)}
            aria-pressed={isOn}
            aria-label={`Toggle ${FLOW_LABELS[type]} flows`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: isOn ? `${color}22` : 'transparent',
              border: `1px solid ${isOn ? color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              color: '#fff',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {FLOW_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

// ── Arc list (HTML overlay — actual WebGL arcs rendered by parent R3F scene) ──
function ArcInfoList({ arcs }: { arcs: FlowArc[] }): React.ReactElement {
  if (arcs.length === 0) return <></>;
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,15,30,0.7)',
        borderRadius: 6,
        padding: '4px 12px',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontFamily: '"Google Sans", sans-serif',
        zIndex: 8200,
        pointerEvents: 'none',
      }}
    >
      {arcs.length} flow arcs visible
    </div>
  );
}

export function FlowEngine(): React.ReactElement {
  const activeFlowTypes = useDigitalTwinStore((s) => s.activeFlowTypes);
  const selectedIso3    = useDigitalTwinStore((s) => s.selectedIso3);
  const activeLayers    = useDigitalTwinStore((s) => s.activeLayers);
  const visible         = activeLayers.has('flows');

  // Fetch all active flow types
  const firstActiveType = Array.from(activeFlowTypes)[0] ?? null;
  const { data: rawArcs } = useFlows(firstActiveType);

  const visibleArcs = useMemo(() => {
    if (!rawArcs || !visible) return [];
    let arcs = rawArcs.filter((a) => activeFlowTypes.has(a.flow_type as FlowType));
    if (selectedIso3) {
      arcs = filterArcsByCountry(arcs, selectedIso3);
    }
    return cullArcs(arcs);
  }, [rawArcs, activeFlowTypes, selectedIso3, visible]);

  return (
    <>
      <FlowControls />
      <ArcInfoList arcs={visibleArcs} />
    </>
  );
}

export default FlowEngine;
