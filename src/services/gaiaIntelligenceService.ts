/**
 * GaiaIntelligenceService — Camada de serviço centralizada
 * Consome /api/offline/* (dados estruturados offline)
 * Respeita VITE_API_BASE_URL global
 */

import type {
  RankingEntry,
  CountryProfile,
  Anomaly,
  PolicySimResult,
  PolicyShocks,
  IndicatorMeta,
  BacktestMetrics,
  DriftEvent,
  SemanticRelation,
} from '../features/gaia-intelligence/types';

import { authFetch, getToken } from './authFetch';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const INTELLIGENCE_ENDPOINTS = {
  RANKING: `${BASE}/api/offline/ranking`,
  COUNTRY: (c: string) => `${BASE}/api/offline/country/${c}`,
  ANOMALIES: (c: string) => `${BASE}/api/offline/anomalies/${c}`,
  SIMULATE: `${BASE}/api/offline/simulate`,
  SEMANTIC: (q: string) => `${BASE}/api/offline/semantic-search?q=${encodeURIComponent(q)}`,
  STATUS: `${BASE}/api/offline/status`,
};

async function get<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export const gaiaIntelligenceService = {
  async getRanking(limit = 50): Promise<RankingEntry[]> {
    const data = await get<{ ranking: RankingEntry[] }>(
      `${INTELLIGENCE_ENDPOINTS.RANKING}?limit=${limit}`
    );
    return data.ranking;
  },

  async getCountryProfile(country: string): Promise<CountryProfile> {
    return get<CountryProfile>(INTELLIGENCE_ENDPOINTS.COUNTRY(country));
  },

  async getAnomalies(country: string): Promise<Anomaly[]> {
    const data = await get<{ anomalies: Anomaly[] }>(
      INTELLIGENCE_ENDPOINTS.ANOMALIES(country)
    );
    return data.anomalies;
  },

  async simulate(country: string, shocks: PolicyShocks): Promise<PolicySimResult> {
    const res = await authFetch(INTELLIGENCE_ENDPOINTS.SIMULATE, {
      method: 'POST',
      body: JSON.stringify({ country, shocks }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async semanticSearch(query: string): Promise<IndicatorMeta[]> {
    const data = await get<{ results: IndicatorMeta[] }>(
      INTELLIGENCE_ENDPOINTS.SEMANTIC(query)
    );
    return data.results;
  },
};

export type { RankingEntry, CountryProfile, Anomaly, PolicySimResult, IndicatorMeta, BacktestMetrics, DriftEvent, SemanticRelation };
