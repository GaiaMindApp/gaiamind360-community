import { authFetch } from './authFetch';
import { API_BASE } from './apiBaseConfig';

const BASE = `${API_BASE}/env/nrt`;

export interface NRTMetric {
  current?: string;
  regions?: { name: string; value: string; change: string }[];
  details?: { label: string; value: string; change: string }[];
  source?: string;
  fetched_at?: string;
  [key: string]: unknown;
}

export interface NRTData {
  air_quality:   NRTMetric;
  humidity:      NRTMetric;
  oceans:        NRTMetric;
  forests:       NRTMetric;
  fires?:        NRTMetric & { total_fires?: number };
  energy_carbon?: NRTMetric;
  fetched_at:    string;
  cache_status?: Record<string, { level: string; age_s: number | null; ttl_s: number; source?: string }>;
}

export async function fetchNRTData(): Promise<NRTData | null> {
  try {
    // Garantir HTTPS em produção (CWE-319)
    const url = BASE.startsWith('http://') && !BASE.includes('localhost') && !BASE.includes('127.0.0.1')
      ? BASE.replace('http://', 'https://')
      : BASE;
    const res = await authFetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
