/**
 * GeoHierarchyLOD — GaiaMind Digital Twin Earth
 * Altitude-to-geographic-level resolver and camera clamping utilities.
 *
 * Requirements: 2.2, 2.5, 2.7, 2.8, 2.9
 * Properties 3 (clamping) and 4 (geo level determination)
 */
import type { GeoLevel } from '../types/digitalTwin.types';

// ─── Camera limits ──────────────────────────────────────────────────────────
export const ALTITUDE_MIN_KM  = 5;
export const ALTITUDE_MAX_KM  = 30_000;
export const LATITUDE_MIN_DEG = -85;
export const LATITUDE_MAX_DEG =  85;

// ─── LOD altitude thresholds ────────────────────────────────────────────────
/** Below this altitude the hierarchy is 'country' (down to STATE threshold) */
export const ALTITUDE_COUNTRY_KM = 1_500;
/** Below this altitude the hierarchy is 'state' (down to CITY threshold) */
export const ALTITUDE_STATE_KM   = 300;
/** Below this altitude the hierarchy is 'city' */
export const ALTITUDE_CITY_KM    = 50;

/**
 * Clamp camera altitude to the valid range [ALTITUDE_MIN_KM, ALTITUDE_MAX_KM].
 * Property 3: for any zoom delta applied to any current altitude, result is in [5, 30000].
 */
export function clampAltitude(km: number): number {
  return Math.min(ALTITUDE_MAX_KM, Math.max(ALTITUDE_MIN_KM, km));
}

/**
 * Clamp camera latitude to the valid range [LATITUDE_MIN_DEG, LATITUDE_MAX_DEG].
 * Property 3: prevents the camera from inverting past the poles.
 */
export function clampLatitude(deg: number): number {
  return Math.min(LATITUDE_MAX_DEG, Math.max(LATITUDE_MIN_DEG, deg));
}

/**
 * Map an altitude in km to the corresponding geographic hierarchy level.
 *
 * Thresholds (requirement 2.7 / 2.8 / 2.9):
 *   altitude > 1500 km  → 'planet'
 *   300 < altitude ≤ 1500 → 'country'
 *   50  < altitude ≤ 300  → 'state'
 *   altitude ≤ 50         → 'city'
 *
 * Property 4: verified by property-based tests.
 */
export function getGeoLevel(altitudeKm: number): GeoLevel {
  if (altitudeKm > ALTITUDE_COUNTRY_KM) return 'planet';
  if (altitudeKm > ALTITUDE_STATE_KM)   return 'country';
  if (altitudeKm > ALTITUDE_CITY_KM)    return 'state';
  return 'city';
}

/**
 * Compute the camera transition duration (seconds) for a fly-to animation,
 * proportional to the great-circle angular distance.
 *
 * Property 30: result is always in [0.3, 2.0] and monotonically increasing with distance.
 *
 * @param angularDistanceDeg - Great-circle distance in degrees (0–180)
 */
export function getTransitionDuration(angularDistanceDeg: number): number {
  const DURATION_MIN = 0.3;
  const DURATION_MAX = 2.0;
  // Linearly map [0°, 180°] → [0.3 s, 2.0 s]
  const t = Math.min(1, Math.max(0, angularDistanceDeg / 180));
  return DURATION_MIN + t * (DURATION_MAX - DURATION_MIN);
}

/**
 * Compute whether the performance mode should be activated.
 * Property 31: returns true iff there are ≥ 3 consecutive seconds with FPS < 30.
 *
 * @param fpsSeries - Array of per-second FPS measurements (most recent last)
 */
export function shouldActivateLowPerfMode(fpsSeries: number[]): boolean {
  if (fpsSeries.length < 3) return false;
  const last3 = fpsSeries.slice(-3);
  return last3.every((fps) => fps < 30);
}
