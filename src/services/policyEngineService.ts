import { authFetch } from './authFetch';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface YearPoint { year: number; value: number; }

export interface EmissionsProjection {
  baseline_series: YearPoint[];
  policy_series: YearPoint[];
  reduction_pct_final: number;
  reduction_ci_low: number;
  reduction_ci_high: number;
}

export interface GDPProjection {
  cumulative_series: YearPoint[];
  impact_direct_pct: number;
  impact_reinvest_pct: number;
  impact_innovation_pct: number;
  impact_total_pct: number;
  inflection_year: number;
  revenue_annual_meur: number;
}

export interface SectorChange {
  output_change_pct: number;
  jobs_change: number;
  direction: 'winner' | 'loser';
  investment_reallocation_meur: number;
}

export interface SectoralChanges {
  sectors: Record<string, SectorChange>;
  top_winner: string | null;
  top_loser: string | null;
}

export interface LeakageRisk {
  leakage_index: number;
  risk_label: string;
  high_risk_sectors: string[];
  delta_carbon_price: number;
}

export interface SocialRiskIndex {
  score: number;
  label: string;
  energy_cost_increase_pct: number;
  jobs_at_risk: number;
  vulnerable_regions: string;
}

export interface PoliticalFeasibility {
  acceptability_no_compensation: number;
  acceptability_with_compensation: number;
  label: string;
  key_barriers: string[];
  key_enablers: string[];
}

export interface CountryResult {
  country: string;
  emissions_projection: EmissionsProjection;
  gdp_projection: GDPProjection;
  sectoral_changes: SectoralChanges;
  leakage_risk: LeakageRisk;
  social_risk_index: SocialRiskIndex;
  political_feasibility_score: PoliticalFeasibility;
}

export interface SimulationMeta {
  simulation_hash: string;
  execution_time_ms: number;
  parameters_snapshot: Record<string, unknown>;
  methodology_note: string;
}

export interface SimulationResponse {
  meta: SimulationMeta;
  results: Record<string, CountryResult>;
}

export interface SimulationRequest {
  countries: string[];
  start_year?: number;
  target_year?: number;
  carbon_price_start?: number;
  carbon_price_target?: number;
}

export const policyEngineService = {
  async simulate(req: SimulationRequest): Promise<SimulationResponse> {
    const res = await authFetch(`${BASE}/api/policy/simulate`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async listCountries(): Promise<{ all_countries: string[]; total: number; calibrated_countries: string[] }> {
    const res = await authFetch(`${BASE}/api/policy/countries`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async explainResult(sim: SimulationResponse, req: SimulationRequest): Promise<{ summary: string; risk_level: string; confidence: number }> {
    const res = await authFetch(`${BASE}/api/explain/policy_engine`, {
      method: 'POST',
      body: JSON.stringify({
        simulation_hash: sim.meta.simulation_hash,
        countries: req.countries,
        start_year: req.start_year ?? 2025,
        target_year: req.target_year ?? 2040,
        carbon_price_start: req.carbon_price_start ?? 75,
        carbon_price_target: req.carbon_price_target ?? 250,
        results: sim.results,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
