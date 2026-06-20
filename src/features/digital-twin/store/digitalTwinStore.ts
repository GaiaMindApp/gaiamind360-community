/**
 * GaiaMind Digital Twin Earth — Store
 * Simple module-level store using vanilla JS + event emitter pattern.
 * Avoids React hook conflicts with @react-three/fiber's React copy.
 * Requirements: 2, 5, 7, 14
 */
import type { LayerType, FlowType, GeoLevel, SubScoreKey } from '../types/digitalTwin.types';

// ── Session persistence ───────────────────────────────────────────────────────
const SESSION_KEY  = 'dte_year';
const CURRENT_YEAR = new Date().getFullYear();

function readYear(): number {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    if (v) { const n = parseInt(v, 10); if (n >= 1950 && n <= 2100) return n; }
  } catch { /* ignore */ }
  return CURRENT_YEAR;
}

function saveYear(y: number) {
  try { sessionStorage.setItem(SESSION_KEY, String(y)); } catch { /* ignore */ }
}

// ── State ─────────────────────────────────────────────────────────────────────
export interface DigitalTwinState {
  cameraAltitudeKm: number;
  cameraLat: number;
  cameraLon: number;
  geoLevel: GeoLevel;
  isFlying: boolean;
  isIdle: boolean;
  autoRotating: boolean;
  selectedIso3: string | null;
  hoveredIso3: string | null;
  activeLayers: Set<LayerType>;
  activeFlowTypes: Set<FlowType>;
  activeRiskDimensions: string[];
  sustainabilitySubScore: SubScoreKey | 'composite';
  accessibilityMode: boolean;
  satelliteViewMode: boolean;
  selectedYear: number;
  playbackActive: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;
  fpsBelow30Count: number;
  lowPerfMode: boolean;
}

let state: DigitalTwinState = {
  cameraAltitudeKm:      15000,
  cameraLat:             20,
  cameraLon:             0,
  geoLevel:              'planet',
  isFlying:              false,
  isIdle:                false,
  autoRotating:          true,
  selectedIso3:          null,
  hoveredIso3:           null,
  activeLayers:          new Set<LayerType>(['borders', 'labels', 'sustainability']),
  activeFlowTypes:       new Set<FlowType>(),
  activeRiskDimensions:  [],
  sustainabilitySubScore: 'composite',
  accessibilityMode:     false,
  satelliteViewMode:     false,
  selectedYear:          readYear(),
  playbackActive:        false,
  playbackSpeed:         1,
  fpsBelow30Count:       0,
  lowPerfMode:           false,
};

// ── Listeners ─────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() { listeners.forEach((l) => l()); }

function setState(partial: Partial<DigitalTwinState>) {
  state = { ...state, ...partial };
  notify();
}

// ── Public store API ──────────────────────────────────────────────────────────
export const digitalTwinStore = {
  getState: () => state,

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Actions
  setAltitude:      (km: number)                   => setState({ cameraAltitudeKm: km }),
  setGeoLevel:      (level: GeoLevel)              => setState({ geoLevel: level }),
  setHoveredIso3:   (iso3: string | null)          => setState({ hoveredIso3: iso3 }),
  setIsFlying:      (flying: boolean)              => setState({ isFlying: flying }),
  setPlaybackActive:(active: boolean)              => setState({ playbackActive: active }),
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10)       => setState({ playbackSpeed: speed }),
  setFpsBelow30Count:(count: number)               => setState({ fpsBelow30Count: count }),
  setLowPerfMode:   (low: boolean)                 => setState({ lowPerfMode: low }),

  flyTo: (iso3: string) => setState({ selectedIso3: iso3, isFlying: true, autoRotating: false }),

  selectCountry: (iso3: string | null) => setState({
    selectedIso3:  iso3,
    autoRotating:  iso3 === null ? state.autoRotating : false,
  }),

  setYear: (year: number) => {
    const clamped = Math.min(2100, Math.max(1950, year));
    saveYear(clamped);
    setState({ selectedYear: clamped });
  },

  toggleLayer: (layer: LayerType) => {
    const next = new Set(state.activeLayers);
    next.has(layer) ? next.delete(layer) : next.add(layer);
    setState({ activeLayers: next });
  },

  toggleFlowType: (type: FlowType) => {
    const next = new Set(state.activeFlowTypes);
    next.has(type) ? next.delete(type) : next.add(type);
    setState({ activeFlowTypes: next });
  },

  activateRiskDimension: (dim: string) => {
    if (state.activeRiskDimensions.includes(dim)) return;
    const next = [...state.activeRiskDimensions, dim];
    if (next.length > 3) next.shift();
    setState({ activeRiskDimensions: next });
  },
};

// ── React hook ────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export function useDigitalTwinStore<T>(selector: (s: DigitalTwinState) => T): T {
  const [value, setValue] = useState<T>(() => selector(state));

  useEffect(() => {
    // Re-run selector on every state change
    const unsubscribe = digitalTwinStore.subscribe(() => {
      const next = selector(state);
      setValue((prev) => {
        // Simple equality check — avoids re-renders for unchanged values
        if (prev === next) return prev;
        return next;
      });
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}

// Convenience alias so existing code using setState pattern works
useDigitalTwinStore.getState  = digitalTwinStore.getState;
useDigitalTwinStore.setState  = (p: Partial<DigitalTwinState>) => setState(p);
useDigitalTwinStore.subscribe = digitalTwinStore.subscribe;

export function isYearProjected(year: number): boolean {
  return year > CURRENT_YEAR;
}
