/**
 * Digital Twin API Service — GaiaMind Digital Twin Earth
 * Typed fetch client for all /api/v1/digital-twin/* endpoints.
 * Requirements: 15.1–15.9
 */
import type {
  GaiaMindScore,
  ForecastObject,
  FlowArc,
  RiskProfile,
  FlowType,
  GlobeAction,
} from '../types/digitalTwin.types';

// ─── Base URL ────────────────────────────────────────────────────────────────
const BASE = '/api/v1/digital-twin';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retrieve the JWT token from wherever the existing auth context stores it. */
function getAuthToken(): string {
  // The existing GaiaMind auth stores the token in localStorage under 'auth_token'
  return localStorage.getItem('auth_token') ?? '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body?.detail ?? `HTTP ${response.status}`), {
      status: response.status,
      code:   body?.code ?? 'UNKNOWN',
    });
  }

  return response.json() as Promise<T>;
}

// ─── Country endpoints ────────────────────────────────────────────────────────

/** GET /api/v1/digital-twin/countries/{iso3}/score */
export function getCountryScore(iso3: string): Promise<GaiaMindScore> {
  return apiFetch<GaiaMindScore>(`/countries/${iso3}/score`);
}

/** GET /api/v1/digital-twin/countries/{iso3}/forecast */
export function getCountryForecast(iso3: string): Promise<ForecastObject[]> {
  return apiFetch<ForecastObject[]>(`/countries/${iso3}/forecast`);
}

// ─── Layer endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/digital-twin/layers/{layer_type}
 * Returns a GeoJSON FeatureCollection for choropleth rendering.
 */
export function getLayer(layerType: string): Promise<GeoJSON.FeatureCollection> {
  return apiFetch<GeoJSON.FeatureCollection>(`/layers/${layerType}`);
}

/** GET /api/v1/digital-twin/flows/{flow_type} */
export function getFlows(flowType: FlowType): Promise<FlowArc[]> {
  return apiFetch<FlowArc[]>(`/flows/${flowType}`);
}

/** GET /api/v1/digital-twin/layers/risk → risk profiles */
export function getRiskLayer(): Promise<RiskProfile[]> {
  return apiFetch<RiskProfile[]>('/layers/risk');
}

// ─── AI action endpoint ───────────────────────────────────────────────────────

export interface AiActionRequest {
  query: string;
  context?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AiActionResponse {
  globe_action: GlobeAction | null;
  text_response: string;
}

/**
 * POST /api/v1/digital-twin/ai-action
 * Sends a natural-language query and receives globe action + text response.
 * Requirements: 12, 15.6
 */
export function postAiAction(payload: AiActionRequest): Promise<AiActionResponse> {
  return apiFetch<AiActionResponse>('/ai-action', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Executive export endpoint ────────────────────────────────────────────────

export interface ExecutiveExportParams {
  iso3: string;         // comma-separated
  indicators: string;   // comma-separated
  year_from: number;
  year_to: number;
}

export interface ExecutiveExportResponse {
  data: Array<{ iso3: string; indicator: string; year: number; value: number }>;
  meta: {
    iso3: string;
    indicators: string;
    year_from: number;
    year_to: number;
    generated_at: string;
  };
}

/**
 * GET /api/v1/digital-twin/executive/export
 * Requirements: 11.4, 11.5
 */
export function getExecutiveExport(
  params: ExecutiveExportParams
): Promise<ExecutiveExportResponse> {
  const qs = new URLSearchParams({
    iso3:       params.iso3,
    indicators: params.indicators,
    year_from:  String(params.year_from),
    year_to:    String(params.year_to),
  });
  return apiFetch<ExecutiveExportResponse>(`/executive/export?${qs}`);
}
