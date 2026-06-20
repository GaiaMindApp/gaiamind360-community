/**
 * useGeographicHierarchy — GaiaMind Digital Twin Earth
 * Returns the current GeoLevel from store and provides a helper to request
 * geometry tiles for a viewport bounds + level combination.
 * Requirements: 3.1–3.8
 */
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import type { GeoLevel } from '../types/digitalTwin.types';

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeometryRequest {
  level: GeoLevel;
  bounds: ViewportBounds;
  /** Tile key for caching (e.g. "country_-90_-180_90_180") */
  tileKey: string;
}

/**
 * Build a cache key from a GeoLevel + viewport bounds.
 * Rounds bounds to 1° grid to maximise cache hits.
 */
function buildTileKey(level: GeoLevel, bounds: ViewportBounds): string {
  const { north, south, east, west } = bounds;
  return `${level}_${Math.floor(south)}_${Math.floor(west)}_${Math.ceil(north)}_${Math.ceil(east)}`;
}

export function useGeographicHierarchy() {
  const geoLevel = useDigitalTwinStore((s) => s.geoLevel);

  /**
   * Build a GeometryRequest for the given viewport bounds at the current LOD level.
   * Pass to your geometry loader / tile fetcher.
   */
  function requestGeometry(bounds: ViewportBounds, overrideLevel?: GeoLevel): GeometryRequest {
    const level = overrideLevel ?? geoLevel;
    return {
      level,
      bounds,
      tileKey: buildTileKey(level, bounds),
    };
  }

  return { geoLevel, requestGeometry };
}
