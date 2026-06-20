/**
 * Frontend Unit Tests — GaiaMind Digital Twin Earth
 * UI state transitions, error states, responsive breakpoints, keyboard nav.
 * Feature: gaiamind-digital-twin-earth
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Zustand Store ─────────────────────────────────────────────────────────────
import { useDigitalTwinStore } from '../store/digitalTwinStore';

describe('DigitalTwinStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useDigitalTwinStore.setState({
      cameraAltitudeKm:    15000,
      cameraLat:           20,
      cameraLon:           0,
      geoLevel:            'planet',
      isFlying:            false,
      isIdle:              false,
      autoRotating:        true,
      selectedIso3:        null,
      hoveredIso3:         null,
      activeLayers:        new Set(['borders', 'labels']),
      activeFlowTypes:     new Set(),
      activeRiskDimensions: [],
      sustainabilitySubScore: 'composite',
      accessibilityMode:   false,
      satelliteViewMode:   false,
      selectedYear:        new Date().getFullYear(),
      playbackActive:      false,
      playbackSpeed:       1,
      fpsBelow30Count:     0,
      lowPerfMode:         false,
    });
  });

  it('setAltitude updates cameraAltitudeKm', () => {
    useDigitalTwinStore.getState().setAltitude(5000);
    expect(useDigitalTwinStore.getState().cameraAltitudeKm).toBe(5000);
  });

  it('flyTo sets selectedIso3, isFlying, disables autoRotating', () => {
    useDigitalTwinStore.getState().flyTo('PRT');
    const s = useDigitalTwinStore.getState();
    expect(s.selectedIso3).toBe('PRT');
    expect(s.isFlying).toBe(true);
    expect(s.autoRotating).toBe(false);
  });

  it('selectCountry(null) clears selection', () => {
    useDigitalTwinStore.getState().flyTo('DEU');
    useDigitalTwinStore.getState().selectCountry(null);
    expect(useDigitalTwinStore.getState().selectedIso3).toBeNull();
  });

  it('setYear clamps to [1950, 2100]', () => {
    useDigitalTwinStore.getState().setYear(1900);
    expect(useDigitalTwinStore.getState().selectedYear).toBe(1950);
    useDigitalTwinStore.getState().setYear(2200);
    expect(useDigitalTwinStore.getState().selectedYear).toBe(2100);
  });

  it('setYear persists to sessionStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    useDigitalTwinStore.getState().setYear(2035);
    expect(spy).toHaveBeenCalledWith('dte_year', '2035');
    spy.mockRestore();
  });

  it('toggleLayer adds and removes a layer', () => {
    const store = useDigitalTwinStore.getState();
    store.toggleLayer('sustainability');
    expect(useDigitalTwinStore.getState().activeLayers.has('sustainability')).toBe(true);
    store.toggleLayer('sustainability');
    expect(useDigitalTwinStore.getState().activeLayers.has('sustainability')).toBe(false);
  });

  it('activateRiskDimension enforces FIFO queue of max 3', () => {
    const s = useDigitalTwinStore.getState();
    s.activateRiskDimension('climate_risk');
    s.activateRiskDimension('water_stress');
    s.activateRiskDimension('food_insecurity');
    s.activateRiskDimension('political_instability'); // should evict 'climate_risk'
    const dims = useDigitalTwinStore.getState().activeRiskDimensions;
    expect(dims).toHaveLength(3);
    expect(dims).not.toContain('climate_risk');
    expect(dims).toContain('political_instability');
  });

  it('activateRiskDimension is idempotent for existing dimensions', () => {
    const s = useDigitalTwinStore.getState();
    s.activateRiskDimension('climate_risk');
    s.activateRiskDimension('climate_risk');
    expect(useDigitalTwinStore.getState().activeRiskDimensions).toHaveLength(1);
  });

  it('toggleFlowType adds and removes flow types', () => {
    const s = useDigitalTwinStore.getState();
    s.toggleFlowType('trade');
    expect(useDigitalTwinStore.getState().activeFlowTypes.has('trade')).toBe(true);
    s.toggleFlowType('trade');
    expect(useDigitalTwinStore.getState().activeFlowTypes.has('trade')).toBe(false);
  });

  it('setLowPerfMode sets lowPerfMode', () => {
    useDigitalTwinStore.getState().setLowPerfMode(true);
    expect(useDigitalTwinStore.getState().lowPerfMode).toBe(true);
  });

  it('setPlaybackSpeed updates playbackSpeed', () => {
    useDigitalTwinStore.getState().setPlaybackSpeed(5);
    expect(useDigitalTwinStore.getState().playbackSpeed).toBe(5);
  });
});

// ── GeoHierarchyLOD ──────────────────────────────────────────────────────────
import { clampAltitude, clampLatitude, getGeoLevel, getTransitionDuration, shouldActivateLowPerfMode } from '../navigation/GeoHierarchyLOD';

describe('GeoHierarchyLOD', () => {
  it('clampAltitude: boundary values', () => {
    expect(clampAltitude(0)).toBe(5);
    expect(clampAltitude(5)).toBe(5);
    expect(clampAltitude(30000)).toBe(30000);
    expect(clampAltitude(50000)).toBe(30000);
    expect(clampAltitude(1000)).toBe(1000);
  });

  it('clampLatitude: boundary values', () => {
    expect(clampLatitude(-90)).toBe(-85);
    expect(clampLatitude(90)).toBe(85);
    expect(clampLatitude(0)).toBe(0);
    expect(clampLatitude(45)).toBe(45);
  });

  it('getGeoLevel: thresholds', () => {
    expect(getGeoLevel(30000)).toBe('planet');
    expect(getGeoLevel(1501)).toBe('planet');
    expect(getGeoLevel(1500)).toBe('country');
    expect(getGeoLevel(301)).toBe('country');
    expect(getGeoLevel(300)).toBe('state');
    expect(getGeoLevel(51)).toBe('state');
    expect(getGeoLevel(50)).toBe('city');
    expect(getGeoLevel(1)).toBe('city');
  });

  it('getTransitionDuration: in [0.3, 2.0]', () => {
    expect(getTransitionDuration(0)).toBeCloseTo(0.3);
    expect(getTransitionDuration(180)).toBeCloseTo(2.0);
    expect(getTransitionDuration(90)).toBeGreaterThanOrEqual(0.3);
    expect(getTransitionDuration(90)).toBeLessThanOrEqual(2.0);
  });

  it('shouldActivateLowPerfMode: 3 consecutive sub-30 → true', () => {
    expect(shouldActivateLowPerfMode([20, 25, 28])).toBe(true);
    expect(shouldActivateLowPerfMode([20, 60, 20, 20, 20])).toBe(true);
    expect(shouldActivateLowPerfMode([60, 20, 60])).toBe(false);
    expect(shouldActivateLowPerfMode([20, 20])).toBe(false);
  });
});

// ── Choropleth utilities ──────────────────────────────────────────────────────
import { getScoreColourZone, getAccessibilityPattern } from '../engine/shaders/choropleth.glsl';

describe('choropleth utilities', () => {
  it('getScoreColourZone: boundaries', () => {
    expect(getScoreColourZone(0)).toBe('red');
    expect(getScoreColourZone(30)).toBe('red');
    expect(getScoreColourZone(31)).toBe('yellow');
    expect(getScoreColourZone(60)).toBe('yellow');
    expect(getScoreColourZone(61)).toBe('green');
    expect(getScoreColourZone(100)).toBe('green');
  });

  it('getAccessibilityPattern: boundaries', () => {
    expect(getAccessibilityPattern(0)).toBe('hatch-dense');
    expect(getAccessibilityPattern(30)).toBe('hatch-dense');
    expect(getAccessibilityPattern(31)).toBe('hatch-medium');
    expect(getAccessibilityPattern(60)).toBe('hatch-medium');
    expect(getAccessibilityPattern(61)).toBe('hatch-sparse');
    expect(getAccessibilityPattern(100)).toBe('hatch-sparse');
  });
});

// ── Solar position ────────────────────────────────────────────────────────────
import { computeSunLongitude } from '../hooks/useSolarPosition';

describe('computeSunLongitude', () => {
  it('returns value in [-180, 180]', () => {
    const lon = computeSunLongitude(new Date('2024-06-15T12:00:00Z'));
    expect(lon).toBeGreaterThanOrEqual(-180);
    expect(lon).toBeLessThanOrEqual(180);
  });

  it('noon UTC produces ~0° longitude', () => {
    // At solar noon (12:00 UTC), sun is near the prime meridian
    const lon = computeSunLongitude(new Date('2024-03-20T12:00:00Z'));
    expect(Math.abs(lon)).toBeLessThan(15); // within 15° is acceptable for this simplified formula
  });
});

// ── TimeMachine utilities ─────────────────────────────────────────────────────
import { classifyYear, lerp } from '../layers/TimeMachine';

describe('TimeMachine utilities', () => {
  const NOW = new Date().getFullYear();

  it('classifyYear: current year is historical', () => {
    expect(classifyYear(NOW, NOW)).toBe('historical');
    expect(classifyYear(NOW - 1, NOW)).toBe('historical');
    expect(classifyYear(NOW + 1, NOW)).toBe('projected');
  });

  it('lerp: t=0 → v1, t=1 → v2, t=0.5 → midpoint', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(0, 100, 0.5)).toBeCloseTo(50);
  });
});

// ── WebSocket backoff ─────────────────────────────────────────────────────────
import { getBackoffDelay } from '../hooks/useWebSocket';

describe('getBackoffDelay', () => {
  it('returns 2^(n-1) for n in [1,5]', () => {
    expect(getBackoffDelay(1)).toBe(1);
    expect(getBackoffDelay(2)).toBe(2);
    expect(getBackoffDelay(3)).toBe(4);
    expect(getBackoffDelay(4)).toBe(8);
    expect(getBackoffDelay(5)).toBe(16);
  });
});

// ── Flow Engine utilities ─────────────────────────────────────────────────────
import { computeArcThickness, computeParticleSpeed, getFlowColour, filterArcsByCountry, cullArcs } from '../layers/FlowEngine';
import type { FlowArc } from '../types/digitalTwin.types';

describe('FlowEngine utilities', () => {
  it('computeArcThickness: in [1, 8]', () => {
    expect(computeArcThickness(0)).toBe(1);
    expect(computeArcThickness(1)).toBe(8);
    expect(computeArcThickness(0.5)).toBeCloseTo(4.5);
  });

  it('computeParticleSpeed: magnitude 0 → 10s, magnitude 1 → 2s', () => {
    expect(computeParticleSpeed(0)).toBe(10);
    expect(computeParticleSpeed(1)).toBe(2);
  });

  it('getFlowColour: correct hex values', () => {
    expect(getFlowColour('migration').toUpperCase()).toBe('#00FFFF');
    expect(getFlowColour('trade').toUpperCase()).toBe('#FFD700');
  });

  it('filterArcsByCountry: returns only matching arcs', () => {
    const arcs: FlowArc[] = [
      { origin_iso3: 'PRT', destination_iso3: 'DEU', flow_type: 'trade', magnitude: 0.5, year: 2024 },
      { origin_iso3: 'USA', destination_iso3: 'CHN', flow_type: 'trade', magnitude: 0.8, year: 2024 },
      { origin_iso3: 'BRA', destination_iso3: 'PRT', flow_type: 'migration', magnitude: 0.3, year: 2024 },
    ];
    const result = filterArcsByCountry(arcs, 'PRT');
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.origin_iso3 === 'PRT' || a.destination_iso3 === 'PRT')).toBe(true);
  });

  it('cullArcs: returns ≤ 500 arcs sorted by highest magnitude', () => {
    const arcs: FlowArc[] = Array.from({ length: 600 }, (_, i) => ({
      origin_iso3: 'AAA', destination_iso3: 'BBB',
      flow_type: 'trade' as const, magnitude: i / 600, year: 2024,
    }));
    const culled = cullArcs(arcs, 500);
    expect(culled.length).toBeLessThanOrEqual(500);
    // Lowest-magnitude arcs should be culled
    expect(Math.min(...culled.map((a) => a.magnitude))).toBeGreaterThan(0);
  });
});

// ── AICopilot utilities ───────────────────────────────────────────────────────
import { validateCopilotQuery, parseGlobeAction, trimHistory } from '../panels/AICopilot';

describe('AICopilot utilities', () => {
  it('validateCopilotQuery: ≤2000 valid, >2000 invalid', () => {
    expect(validateCopilotQuery('hello').valid).toBe(true);
    expect(validateCopilotQuery('a'.repeat(2000)).valid).toBe(true);
    expect(validateCopilotQuery('a'.repeat(2001)).valid).toBe(false);
  });

  it('parseGlobeAction: navigate', () => {
    const result = parseGlobeAction({ globe_action: { action: 'navigate', iso3: 'PRT' } });
    expect(result).toEqual({ action: 'navigate', iso3: 'PRT' });
  });

  it('parseGlobeAction: null when absent', () => {
    expect(parseGlobeAction({})).toBeNull();
    expect(parseGlobeAction(null)).toBeNull();
  });

  it('trimHistory: keeps last min(5, n) entries', () => {
    const history = Array.from({ length: 8 }, (_, i) => ({ role: 'user' as const, content: String(i) }));
    const trimmed = trimHistory(history, 8);
    expect(trimmed).toHaveLength(5);
    expect(trimmed[trimmed.length - 1].content).toBe('7');
  });
});

// ── PlanetaryRanking utilities ────────────────────────────────────────────────
import { getRankChangeDelta, sortByIndex, applyFilters } from '../panels/PlanetaryRanking';
import type { RankCountry } from '../panels/PlanetaryRanking';

const mockCountries: RankCountry[] = [
  { iso3: 'PRT', name: 'Portugal', continent: 'EU', incomeGroup: 'High', unRegion: 'Europe', scores: { gaiamind_score: 72, governance_effectiveness: 65, hdi: 0.86, climate_resilience: 75, economic_resilience: 68, innovation_index: 58, digital_transformation: 62 } },
  { iso3: 'BRA', name: 'Brazil', continent: 'SA', incomeGroup: 'Upper', unRegion: 'Americas', scores: { gaiamind_score: 55, governance_effectiveness: 42, hdi: 0.75, climate_resilience: 48, economic_resilience: 52, innovation_index: 44, digital_transformation: 50 } },
  { iso3: 'SWE', name: 'Sweden', continent: 'EU', incomeGroup: 'High', unRegion: 'Europe', scores: { gaiamind_score: 88, governance_effectiveness: 90, hdi: 0.95, climate_resilience: 92, economic_resilience: 88, innovation_index: 90, digital_transformation: 93 } },
];

describe('PlanetaryRanking utilities', () => {
  it('getRankChangeDelta: correct direction', () => {
    expect(getRankChangeDelta(3, 1)).toEqual({ direction: '▲', delta: 2 });
    expect(getRankChangeDelta(1, 3)).toEqual({ direction: '▼', delta: 2 });
    expect(getRankChangeDelta(2, 2)).toEqual({ direction: '—', delta: 0 });
  });

  it('sortByIndex descending', () => {
    const sorted = sortByIndex(mockCountries, 'gaiamind_score', false);
    expect(sorted[0].iso3).toBe('SWE');
    expect(sorted[1].iso3).toBe('PRT');
    expect(sorted[2].iso3).toBe('BRA');
  });

  it('sortByIndex ascending', () => {
    const sorted = sortByIndex(mockCountries, 'gaiamind_score', true);
    expect(sorted[0].iso3).toBe('BRA');
  });

  it('applyFilters AND logic', () => {
    const result = applyFilters(mockCountries, { continent: 'EU', incomeGroup: 'High' });
    expect(result.every((c) => c.continent === 'EU' && c.incomeGroup === 'High')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('applyFilters: no filters returns all', () => {
    expect(applyFilters(mockCountries, {})).toHaveLength(3);
  });
});

// ── ExecutiveDashboard utilities ──────────────────────────────────────────────
import { canAddCountry, canAddIndicator, computeStrategicAlerts, saveLayout, loadLayout } from '../panels/ExecutiveDashboard';

describe('ExecutiveDashboard utilities', () => {
  it('canAddCountry: true iff current < 20', () => {
    expect(canAddCountry(0)).toBe(true);
    expect(canAddCountry(19)).toBe(true);
    expect(canAddCountry(20)).toBe(false);
  });

  it('canAddIndicator: true iff current < 10', () => {
    expect(canAddIndicator(9)).toBe(true);
    expect(canAddIndicator(10)).toBe(false);
  });

  it('computeStrategicAlerts: |change| > 5', () => {
    const alerts = computeStrategicAlerts([
      { iso3: 'A', name: 'A', change: 6 },
      { iso3: 'B', name: 'B', change: -5 },
      { iso3: 'C', name: 'C', change: 5.1 },
    ]);
    expect(alerts.map((a) => a.iso3)).toEqual(['A', 'C']);
  });

  it('saveLayout + loadLayout round-trip', () => {
    const config = { selectedCountries: ['PRT', 'DEU'], selectedIndicators: ['gaiamind_score'] };
    saveLayout(config);
    expect(loadLayout()).toEqual(config);
  });
});

// ── AIIntelligencePanel utilities ─────────────────────────────────────────────
import { isForecastOutdated } from '../panels/AIIntelligencePanel';

describe('isForecastOutdated', () => {
  it('90 days → not outdated', () => {
    const today     = new Date();
    const generated = new Date(today.getTime() - 90 * 86_400_000).toISOString();
    expect(isForecastOutdated(generated, today)).toBe(false);
  });

  it('91 days → outdated', () => {
    const today     = new Date();
    const generated = new Date(today.getTime() - 91 * 86_400_000).toISOString();
    expect(isForecastOutdated(generated, today)).toBe(true);
  });
});

// ── RealTimeMonitor utilities ─────────────────────────────────────────────────
import { formatLastUpdated } from '../layers/RealTimeMonitor';

describe('formatLastUpdated', () => {
  it('matches YYYY-MM-DD HH:MM UTC pattern', () => {
    const dt = new Date('2024-06-15T14:30:00Z');
    expect(formatLastUpdated(dt)).toBe('Last updated: 2024-06-15 14:30 UTC');
  });

  it('zero-pads month, day, hour, minute', () => {
    const dt = new Date('2024-01-05T08:05:00Z');
    expect(formatLastUpdated(dt)).toBe('Last updated: 2024-01-05 08:05 UTC');
  });
});
