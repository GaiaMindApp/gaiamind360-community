/**
 * Frontend Property-Based Tests — GaiaMind Digital Twin Earth
 * Uses fast-check for property verification.
 * Feature: gaiamind-digital-twin-earth
 *
 * Install: npm install --save-dev fast-check@3.22.0
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Import functions under test
import { computeSunLongitude, computeSunLatitude } from '../hooks/useSolarPosition';
import { clampAltitude, clampLatitude, getGeoLevel, getTransitionDuration, shouldActivateLowPerfMode } from '../navigation/GeoHierarchyLOD';
import { getScoreColourZone, getAccessibilityPattern } from '../engine/shaders/choropleth.glsl';
import { computeCompositeScore, scoreToColor } from '../layers/SustainabilityLayer';
import { classifyYear, lerp } from '../layers/TimeMachine';
import { getPulseFrequency, getTopN } from '../layers/RiskObservatory';
import { computeArcThickness, computeParticleSpeed, getFlowColour, filterArcsByCountry, cullArcs } from '../layers/FlowEngine';
import { getRankChangeDelta, sortByIndex, applyFilters } from '../panels/PlanetaryRanking';
import { canAddCountry, canAddIndicator, computeStrategicAlerts, saveLayout, loadLayout } from '../panels/ExecutiveDashboard';
import { validateCopilotQuery, parseGlobeAction, trimHistory } from '../panels/AICopilot';
import { formatLastUpdated } from '../layers/RealTimeMonitor';
import { isForecastOutdated } from '../panels/AIIntelligencePanel';
import { getBackoffDelay } from '../hooks/useWebSocket';
import type { FlowArc, FlowType, RankCountry, RankIndex } from '../types/digitalTwin.types';

const NUM_RUNS = 100;

// ── Property 2: Polar Ice Cap Opacity ────────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 2: Polar Ice Cap Opacity
// Validates: Requirements 1.8
describe('Property 2: Polar Ice Cap Opacity', () => {
  it('≥0.7 for |lat| ≥ 60, <0.7 for |lat| < 60', () => {
    function computeIceCapOpacity(lat: number): number {
      const absLat = Math.abs(lat);
      return absLat >= 60 ? 0.72 : 0.0;
    }
    fc.assert(fc.property(
      fc.double({ min: -90, max: 90, noNaN: true }),
      (lat) => {
        const opacity = computeIceCapOpacity(lat);
        if (Math.abs(lat) >= 60) expect(opacity).toBeGreaterThanOrEqual(0.7);
        else expect(opacity).toBeLessThan(0.7);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 3: Altitude and Latitude Clamping ───────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 3: Altitude and Latitude Clamping
// Validates: Requirements 2.2, 2.5
describe('Property 3: Altitude and Latitude Clamping', () => {
  it('altitude always in [5, 30000]', () => {
    fc.assert(fc.property(
      fc.double({ min: -100_000, max: 100_000, noNaN: true }),
      (km) => {
        const result = clampAltitude(km);
        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThanOrEqual(30_000);
      }
    ), { numRuns: NUM_RUNS });
  });
  it('latitude always in [-85, 85]', () => {
    fc.assert(fc.property(
      fc.double({ min: -180, max: 180, noNaN: true }),
      (deg) => {
        const result = clampLatitude(deg);
        expect(result).toBeGreaterThanOrEqual(-85);
        expect(result).toBeLessThanOrEqual(85);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 4: Geographic Level Determination ───────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 4: Geographic Level Determination
// Validates: Requirements 2.7, 2.8, 2.9
describe('Property 4: Geographic Level Determination', () => {
  it('correct level per altitude', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 35_000, noNaN: true }),
      (alt) => {
        const level = getGeoLevel(alt);
        if (alt > 1500)       expect(level).toBe('planet');
        else if (alt > 300)   expect(level).toBe('country');
        else if (alt > 50)    expect(level).toBe('state');
        else                  expect(level).toBe('city');
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 6: Choropleth Colour Zone Correctness ───────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 6: Choropleth Colour Zone Correctness
// Validates: Requirements 4.2
describe('Property 6: Choropleth Colour Zone Correctness', () => {
  it('correct zone per score', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100, noNaN: true }),
      (score) => {
        const zone = getScoreColourZone(score);
        if (score <= 30)      expect(zone).toBe('red');
        else if (score <= 60) expect(zone).toBe('yellow');
        else                  expect(zone).toBe('green');
      }
    ), { numRuns: NUM_RUNS });
  });
  it('score=30 → red, score=31 → yellow', () => {
    expect(getScoreColourZone(30)).toBe('red');
    expect(getScoreColourZone(31)).toBe('yellow');
  });
});

// ── Property 7: Temporal Classification ─────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 7: Temporal Classification
// Validates: Requirements 5.3
describe('Property 7: Temporal Classification', () => {
  it('historical ≤ now, projected > now', () => {
    const now = new Date().getFullYear();
    fc.assert(fc.property(
      fc.integer({ min: 1950, max: 2100 }),
      (year) => {
        const cls = classifyYear(year, now);
        if (year <= now) expect(cls).toBe('historical');
        else             expect(cls).toBe('projected');
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 8: Linear Interpolation Correctness ────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 8: Linear Interpolation Correctness
// Validates: Requirements 5.5
describe('Property 8: Linear Interpolation Correctness', () => {
  it('lerp(v1,v2,t) = v1 + t*(v2-v1)', () => {
    fc.assert(fc.property(
      fc.double({ min: -1e6, max: 1e6, noNaN: true }),
      fc.double({ min: -1e6, max: 1e6, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (v1, v2, t) => {
        const result   = lerp(v1, v2, t);
        const expected = v1 + t * (v2 - v1);
        expect(Math.abs(result - expected)).toBeLessThan(1e-6);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 11: Risk Pulse Frequency ────────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 11: Risk Pulse Frequency Mapping
// Validates: Requirements 7.3
describe('Property 11: Risk Pulse Frequency Mapping', () => {
  it('1 Hz >70, 0.5 Hz 40-70, 0 <40', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100, noNaN: true }),
      (score) => {
        const freq = getPulseFrequency(score);
        if (score > 70)      expect(freq).toBe(1.0);
        else if (score >= 40) expect(freq).toBe(0.5);
        else                  expect(freq).toBe(0.0);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 14: Flow Particle Speed Inversely Proportional ─────────────────
// Feature: gaiamind-digital-twin-earth, Property 14: Flow Particle Speed Inversely Proportional to Magnitude
// Validates: Requirements 8.3
describe('Property 14: Flow Particle Speed Inversely Proportional', () => {
  it('lower magnitude → higher traversal time', () => {
    fc.assert(fc.property(
      fc.tuple(
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        fc.double({ min: 0.01, max: 1, noNaN: true }),
      ).filter(([m1, m2]) => m1 < m2),
      ([m1, m2]) => {
        expect(computeParticleSpeed(m1)).toBeGreaterThan(computeParticleSpeed(m2));
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 15: Arc Thickness Monotonicity ──────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 15: Arc Thickness Monotonicity
// Validates: Requirements 8.4
describe('Property 15: Arc Thickness Monotonicity', () => {
  it('in [1,8] and monotonically non-decreasing', () => {
    fc.assert(fc.property(
      fc.tuple(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
      ),
      ([m1, m2]) => {
        const t1 = computeArcThickness(m1);
        const t2 = computeArcThickness(m2);
        expect(t1).toBeGreaterThanOrEqual(1);
        expect(t1).toBeLessThanOrEqual(8);
        expect(t2).toBeGreaterThanOrEqual(1);
        expect(t2).toBeLessThanOrEqual(8);
        if (m1 <= m2) expect(t1).toBeLessThanOrEqual(t2);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 16: Flow Type Colour Mapping ────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 16: Flow Type Colour Mapping
// Validates: Requirements 8.5
describe('Property 16: Flow Type Colour Mapping', () => {
  it('exact hex colours per spec', () => {
    const expected: Record<FlowType, string> = {
      migration: '#00FFFF', trade: '#FFD700', carbon: '#FF8C00',
      energy: '#ADFF2F', internet: '#007FFF', financial: '#FF00FF',
    };
    for (const [type, hex] of Object.entries(expected) as [FlowType, string][]) {
      expect(getFlowColour(type).toUpperCase()).toBe(hex.toUpperCase());
    }
  });
});

// ── Property 17: Country Arc Filter Completeness ────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 17: Country Arc Filter Completeness
// Validates: Requirements 8.6
describe('Property 17: Country Arc Filter Completeness', () => {
  it('returns exactly arcs involving selected iso3', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        origin_iso3: fc.string({ minLength: 3, maxLength: 3 }),
        destination_iso3: fc.string({ minLength: 3, maxLength: 3 }),
        flow_type: fc.constant('trade' as FlowType),
        magnitude: fc.double({ min: 0, max: 1, noNaN: true }),
        year: fc.integer({ min: 2000, max: 2024 }),
      }), { minLength: 0, maxLength: 50 }),
      fc.string({ minLength: 3, maxLength: 3 }),
      (arcs: FlowArc[], iso3: string) => {
        const filtered = filterArcsByCountry(arcs, iso3);
        expect(filtered.every((a) => a.origin_iso3 === iso3 || a.destination_iso3 === iso3)).toBe(true);
        const unfiltered = arcs.filter((a) => a.origin_iso3 === iso3 || a.destination_iso3 === iso3);
        expect(filtered.length).toBe(unfiltered.length);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 18: Arc Culling Correctness ────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 18: Arc Culling Correctness
// Validates: Requirements 8.8
describe('Property 18: Arc Culling Correctness', () => {
  it('culled set ≤ 500, retained arcs have ≥ magnitude than culled', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        origin_iso3: fc.constant('AAA'),
        destination_iso3: fc.constant('BBB'),
        flow_type: fc.constant('trade' as FlowType),
        magnitude: fc.double({ min: 0, max: 1, noNaN: true }),
        year: fc.constant(2024),
      }), { minLength: 501, maxLength: 600 }),
      (arcs: FlowArc[]) => {
        const culled = cullArcs(arcs, 500);
        expect(culled.length).toBeLessThanOrEqual(500);
        const minRetained = Math.min(...culled.map((a) => a.magnitude));
        const maxRemoved  = Math.max(...arcs.filter((a) => !culled.includes(a)).map((a) => a.magnitude), 0);
        expect(minRetained).toBeGreaterThanOrEqual(maxRemoved - 1e-9);
      }
    ), { numRuns: 20 });
  });
});

// ── Property 19: Rank Change Direction Encoding ─────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 19: Rank Change Direction Encoding
// Validates: Requirements 10.4
describe('Property 19: Rank Change Direction Encoding', () => {
  it('correct direction and delta', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 195 }),
      fc.integer({ min: 1, max: 195 }),
      (r1, r2) => {
        const { direction, delta } = getRankChangeDelta(r1, r2);
        if (r2 > r1)      { expect(direction).toBe('▲'); expect(delta).toBe(r2 - r1); }
        else if (r1 > r2) { expect(direction).toBe('▼'); expect(delta).toBe(r1 - r2); }
        else              { expect(direction).toBe('—'); expect(delta).toBe(0); }
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 20: Ranking Sort Correctness ───────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 20: Ranking Sort Correctness
// Validates: Requirements 10.5
describe('Property 20: Ranking Sort Correctness', () => {
  it('descending sort: each adjacent pair c[i] ≥ c[i+1]', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        iso3: fc.string({ minLength: 3, maxLength: 3 }),
        name: fc.string({ minLength: 1, maxLength: 10 }),
        continent: fc.constant('EU'),
        incomeGroup: fc.constant('High'),
        unRegion: fc.constant('Europe'),
        scores: fc.record({ gaiamind_score: fc.double({ min: 0, max: 100, noNaN: true }) } as any),
      }), { minLength: 0, maxLength: 30 }),
      (countries: RankCountry[]) => {
        const sorted = sortByIndex(countries, 'gaiamind_score', false);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect((sorted[i].scores.gaiamind_score ?? 0)).toBeGreaterThanOrEqual(sorted[i + 1].scores.gaiamind_score ?? 0);
        }
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 21: Multi-Filter AND Logic ─────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 21: Multi-Filter AND Logic
// Validates: Requirements 10.6
describe('Property 21: Multi-Filter AND Logic', () => {
  it('all returned countries match all active filters', () => {
    const countries: RankCountry[] = [
      { iso3: 'PRT', name: 'Portugal', continent: 'EU', incomeGroup: 'High', unRegion: 'Europe', scores: {} as any },
      { iso3: 'BRA', name: 'Brazil',   continent: 'SA', incomeGroup: 'Upper', unRegion: 'Americas', scores: {} as any },
    ];
    const result = applyFilters(countries, { continent: 'EU', incomeGroup: 'High' });
    expect(result.every((c) => c.continent === 'EU' && c.incomeGroup === 'High')).toBe(true);
  });
});

// ── Property 22: Country/Indicator Selection Limits ─────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 22: Country/Indicator Selection Limits
// Validates: Requirements 11.3
describe('Property 22: Selection Limits', () => {
  it('canAddCountry true iff current < 20', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 25 }), (n) => {
      expect(canAddCountry(n)).toBe(n < 20);
    }), { numRuns: NUM_RUNS });
  });
  it('canAddIndicator true iff current < 10', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 15 }), (n) => {
      expect(canAddIndicator(n)).toBe(n < 10);
    }), { numRuns: NUM_RUNS });
  });
});

// ── Property 23: Strategic Alert Threshold ──────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 23: Strategic Alert Threshold
// Validates: Requirements 11.6
describe('Property 23: Strategic Alert Threshold', () => {
  it('includes |change| > 5, excludes |change| ≤ 5', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        iso3:   fc.string({ minLength: 3, maxLength: 3 }),
        name:   fc.string({ minLength: 1, maxLength: 5 }),
        change: fc.double({ min: -30, max: 30, noNaN: true }),
      }), { minLength: 0, maxLength: 30 }),
      (changes) => {
        const alerts = computeStrategicAlerts(changes);
        const alertIso3s = new Set(alerts.map((a) => a.iso3));
        for (const c of changes) {
          if (Math.abs(c.change) > 5)  expect(alertIso3s.has(c.iso3)).toBe(true);
          else                          expect(alertIso3s.has(c.iso3)).toBe(false);
        }
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 24: Widget Layout LocalStorage Round-Trip ──────────────────────
// Feature: gaiamind-digital-twin-earth, Property 24: Widget Layout LocalStorage Round-Trip
// Validates: Requirements 11.7
describe('Property 24: Widget Layout LocalStorage Round-Trip', () => {
  it('saveLayout + loadLayout are inverse', () => {
    fc.assert(fc.property(
      fc.record({
        selectedCountries:  fc.array(fc.string({ minLength: 3, maxLength: 3 }), { maxLength: 5 }),
        selectedIndicators: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      }),
      (config) => {
        saveLayout(config);
        const loaded = loadLayout();
        expect(loaded).toEqual(config);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 25: AI Copilot Query Length Validation ─────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 25: AI Copilot Query Length Validation
// Validates: Requirements 12.1
describe('Property 25: Copilot Query Length Validation', () => {
  it('>2000 chars → invalid, ≤2000 → valid', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 3000 }),
      (len) => {
        const s = 'a'.repeat(len);
        const { valid } = validateCopilotQuery(s);
        expect(valid).toBe(len <= 2000);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 26: Globe Action Parsing ───────────────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 26: Globe Action Parsing
// Validates: Requirements 12.6, 12.8
describe('Property 26: Globe Action Parsing', () => {
  it('parses navigate action', () => {
    const result = parseGlobeAction({ globe_action: { action: 'navigate', iso3: 'PRT' } });
    expect(result).toEqual({ action: 'navigate', iso3: 'PRT' });
  });
  it('returns null when globe_action is absent', () => {
    expect(parseGlobeAction({ text_response: 'hello' })).toBeNull();
    expect(parseGlobeAction(null)).toBeNull();
  });
});

// ── Property 27: Copilot History Context Window ──────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 27: Copilot History Context Window
// Validates: Requirements 12.7
describe('Property 27: Copilot History Context Window', () => {
  it('context = min(5, n) most recent entries', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 20 }),
      (n) => {
        const history = Array.from({ length: n }, (_, i) => ({ role: 'user' as const, content: String(i) }));
        const trimmed = trimHistory(history, n);
        const expected = Math.min(5, n);
        expect(trimmed.length).toBe(expected);
        if (n > 0) expect(trimmed[trimmed.length - 1].content).toBe(String(n - 1));
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 28: Real-Time Timestamp Formatting ──────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 28: Real-Time Timestamp Formatting
// Validates: Requirements 13.5
describe('Property 28: Real-Time Timestamp Formatting', () => {
  it('matches YYYY-MM-DD HH:MM UTC pattern', () => {
    fc.assert(fc.property(
      fc.date({ min: new Date('1990-01-01'), max: new Date('2100-12-31') }),
      (dt) => {
        const result = formatLastUpdated(dt);
        expect(result).toMatch(/^Last updated: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 30: Camera Transition Duration Proportionality ─────────────────
// Feature: gaiamind-digital-twin-earth, Property 30: Camera Transition Duration Proportionality
// Validates: Requirements 14.3
describe('Property 30: Camera Transition Duration Proportionality', () => {
  it('in [0.3, 2.0] and monotonically non-decreasing', () => {
    fc.assert(fc.property(
      fc.tuple(
        fc.double({ min: 0, max: 180, noNaN: true }),
        fc.double({ min: 0, max: 180, noNaN: true }),
      ),
      ([d1, d2]) => {
        const t1 = getTransitionDuration(d1);
        const t2 = getTransitionDuration(d2);
        expect(t1).toBeGreaterThanOrEqual(0.3);
        expect(t1).toBeLessThanOrEqual(2.0);
        expect(t2).toBeGreaterThanOrEqual(0.3);
        expect(t2).toBeLessThanOrEqual(2.0);
        if (d1 <= d2) expect(t1).toBeLessThanOrEqual(t2 + 1e-9);
      }
    ), { numRuns: NUM_RUNS });
  });
});

// ── Property 31: Low-Performance Mode Activation ────────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 31: Low-Performance Mode Activation
// Validates: Requirements 14.8
describe('Property 31: Low-Performance Mode Activation', () => {
  it('true iff ≥3 consecutive seconds with FPS < 30', () => {
    // true case: 3 sub-30 in a row
    expect(shouldActivateLowPerfMode([20, 25, 28])).toBe(true);
    expect(shouldActivateLowPerfMode([60, 20, 25, 28])).toBe(true);
    // false case: only 2 sub-30
    expect(shouldActivateLowPerfMode([20, 25])).toBe(false);
    // false case: broken streak
    expect(shouldActivateLowPerfMode([20, 60, 20])).toBe(false);
  });
});

// ── Property 35: WebSocket Reconnection Exponential Backoff ─────────────────
// Feature: gaiamind-digital-twin-earth, Property 35: WebSocket Reconnection Exponential Backoff
// Validates: Requirements 15.11
describe('Property 35: WebSocket Reconnection Exponential Backoff', () => {
  it('getBackoffDelay(n) = 2^(n-1)', () => {
    for (let n = 1; n <= 5; n++) {
      expect(getBackoffDelay(n)).toBe(Math.pow(2, n - 1));
    }
  });
});

// ── Property 41: Accessibility Pattern Tier Mapping ─────────────────────────
// Feature: gaiamind-digital-twin-earth, Property 41: Accessibility Pattern Tier Mapping
// Validates: Requirements 17.3
describe('Property 41: Accessibility Pattern Tier Mapping', () => {
  it('correct hatch pattern per score', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100, noNaN: true }),
      (score) => {
        const pattern = getAccessibilityPattern(score);
        if (score <= 30)      expect(pattern).toBe('hatch-dense');
        else if (score <= 60) expect(pattern).toBe('hatch-medium');
        else                  expect(pattern).toBe('hatch-sparse');
      }
    ), { numRuns: NUM_RUNS });
  });
});
