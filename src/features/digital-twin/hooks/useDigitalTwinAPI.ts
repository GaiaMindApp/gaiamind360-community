/**
 * useDigitalTwinAPI — GaiaMind Digital Twin Earth
 * Custom fetch hooks for all Digital Twin API endpoints.
 * Uses native fetch + React state (no external query library needed).
 * Requirements: 15.1–15.5
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/digitalTwinApiService';
import type { GaiaMindScore, ForecastObject, FlowArc, RiskProfile, FlowType } from '../types/digitalTwin.types';

// ── Generic fetch hook ────────────────────────────────────────────────────────
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
}

function useFetch<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[],
  cacheKey?: string
): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: false, error: null, isStale: false });
  const cache = useRef<Map<string, { data: T; ts: number }>>(new Map());
  const STALE_MS = 60_000;

  const run = useCallback(async () => {
    if (!fetcher) return;
    // Check in-memory cache
    if (cacheKey) {
      const hit = cache.current.get(cacheKey);
      if (hit) {
        const stale = Date.now() - hit.ts > STALE_MS;
        setState({ data: hit.data, loading: false, error: null, isStale: stale });
        if (!stale) return;
      }
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (cacheKey) cache.current.set(cacheKey, { data, ts: Date.now() });
      setState({ data, loading: false, error: null, isStale: false });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err as Error }));
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, [run]);

  return state;
}

// ── Country score ─────────────────────────────────────────────────────────────
export function useCountryScore(iso3: string | null): FetchState<GaiaMindScore> {
  return useFetch<GaiaMindScore>(
    iso3 ? () => api.getCountryScore(iso3) : null,
    [iso3],
    iso3 ? `score:${iso3}` : undefined
  );
}

// ── Country forecast ──────────────────────────────────────────────────────────
export function useCountryForecast(iso3: string | null): FetchState<ForecastObject[]> {
  return useFetch<ForecastObject[]>(
    iso3 ? () => api.getCountryForecast(iso3) : null,
    [iso3],
    iso3 ? `forecast:${iso3}` : undefined
  );
}

// ── GeoJSON layer ─────────────────────────────────────────────────────────────
export function useLayer(layerType: string): FetchState<GeoJSON.FeatureCollection> {
  return useFetch<GeoJSON.FeatureCollection>(
    () => api.getLayer(layerType),
    [layerType],
    `layer:${layerType}`
  );
}

// ── Flow arcs ─────────────────────────────────────────────────────────────────
export function useFlows(flowType: FlowType | null): FetchState<FlowArc[]> {
  return useFetch<FlowArc[]>(
    flowType ? () => api.getFlows(flowType) : null,
    [flowType],
    flowType ? `flows:${flowType}` : undefined
  );
}

// ── Risk layer ────────────────────────────────────────────────────────────────
export function useRiskLayer(): FetchState<RiskProfile[]> {
  return useFetch<RiskProfile[]>(
    () => api.getRiskLayer(),
    [],
    'layer:risk'
  );
}
