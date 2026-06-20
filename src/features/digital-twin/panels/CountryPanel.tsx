/**
 * CountryPanel — GaiaMind Digital Twin Earth
 * Enterprise-grade panel: TSI v9 + Explainable AI + Forecast
 * Opens when clicking a capital pin or country polygon.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';

// ── Auth ──────────────────────────────────────────────────────────────────────
const AUTH_KEY = 'gaiamind-auth';
function getToken(): string {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) ?? '{}')?.token ?? ''; }
  catch { return ''; }
}
function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TsiV9 {
  country: string;
  code: string;
  tsi: number;
  tsi_score: number;
  S: number;
  T: number;
  T_eff: number;
  A: number;
  S_score: number;
  T_score: number;
  rank?: number;
  classification: string;
  // S components (flat fields from tsi_v9.py)
  s_ihdi: number;
  s_edu:  number;
  s_gov:  number;
  s_ess:  number;
  // T components (flat fields from tsi_v9.py)
  t_co2:      number;
  t_defor:    number;
  t_trend:    number;
  t_conflict: number;
  // Raw values
  co2_fossil:    number;
  co2_lulucf:    number;
  co2_total:     number;
  co2_trend_pct: number;
  forest_pct:    number;
  defor_rate:    number;
  water_pct:     number | null;
  renew_pct:     number;
  ihdi:          number;
  edu_years:     number;
  vdem:          number;
  conflict_rate: number;
  R:       number;
  alert:   string;
  regime:  string;
  verdict: string;
}

interface AIInsight {
  summary: string;
  risk_level: string;
  confidence: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  'Frontier Leader':      '#22c55e',
  'High Performer':       '#4ade80',
  'Moderate Performer':   '#f59e0b',
  'Under Pressure':       '#f97316',
  'Critical':             '#ef4444',
};
function tsiColor(s: number) {
  if (s >= 0.65) return '#22c55e';
  if (s >= 0.45) return '#4ade80';
  if (s >= 0.30) return '#f59e0b';
  if (s >= 0.15) return '#f97316';
  return '#ef4444';
}
function fmtNum(v: number | null | undefined, decimals = 2) {
  if (v == null) return '—';
  return v.toFixed(decimals);
}
function riskBadgeColor(r: string) {
  const m: Record<string, string> = {
    Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444',
  };
  return m[r] || '#6b7280';
}

// ── Bar component ─────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.7s ease' }} />
    </div>
  );
}

// ── Component Pill ────────────────────────────────────────────────────────────
function ComponentRow({ label, value, max = 1 }: { label: string; value: number | undefined; max?: number }) {
  if (value == null) return null;
  const color = value >= 0.6 ? '#22c55e' : value >= 0.35 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>{fmtNum(value)}</span>
      </div>
      <ScoreBar value={value} max={max} color={color} />
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function CountryPanel(): React.ReactElement | null {
  const { t } = useTranslation();
  const selectedIso3 = useDigitalTwinStore((s) => s.selectedIso3);

  const [tsi, setTsi]           = useState<TsiV9 | null>(null);
  const [insight, setInsight]   = useState<AIInsight | null>(null);
  const [loading, setLoading]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]       = useState<'auth' | 'unavailable' | null>(null);
  const [tab, setTab]           = useState<'profile' | 'ai'>('profile');

  // Fetch TSI v9
  useEffect(() => {
    if (!selectedIso3) { setTsi(null); setInsight(null); setError(null); return; }
    setLoading(true); setError(null); setTsi(null); setInsight(null); setTab('profile');

    fetch(`/api/tsi/country/${selectedIso3}`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) throw Object.assign(new Error(), { type: 'auth' });
        if (!r.ok) throw Object.assign(new Error(), { type: 'unavailable' });
        return r.json();
      })
      .then(data => {
        // Fetch ranking to get position (country endpoint doesn't include rank)
        fetch('/api/tsi/ranking?top=200', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(rankData => {
            if (rankData?.ranking) {
              const pos = (rankData.ranking as any[]).findIndex(
                (c: any) => c.code === data.code
              );
              data.rank = pos >= 0 ? pos + 1 : undefined;
            }
            setTsi(data);
          })
          .catch(() => setTsi(data));
      })
      .catch(e => setError(e.type ?? 'unavailable'))
      .finally(() => setLoading(false));
  }, [selectedIso3]);

  // Fetch AI explanation (after TSI loaded)
  const fetchAI = useCallback(() => {
    if (!tsi) return;
    setAiLoading(true);
    fetch('/api/explain/score_trend', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country:      tsi.country,
        slope:        0,
        volatility:   0.05,
        main_drivers: {
          IHDI:  tsi.s_ihdi ?? 0,
          EDU:   tsi.s_edu  ?? 0,
          GOV:   tsi.s_gov  ?? 0,
          CO2:   tsi.t_co2  ?? 0,
          DEFOR: tsi.t_defor ?? 0,
        },
        period_start:  2020,
        period_end:    2024,
        anomaly_count: 0,
        current_score: tsi.tsi,
        rank:          tsi.rank,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setInsight(d))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [tsi]);

  useEffect(() => { if (tsi) fetchAI(); }, [tsi, fetchAI]);

  if (!selectedIso3) return null;

  const tierColor = tsi ? (TIER_COLORS[tsi.classification] ?? '#6b7280') : '#6b7280';

  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, zIndex: 500,
      width: 'clamp(280px, 25vw, 340px)',
      maxHeight: 'calc(100vh - 80px)',
      background: 'rgba(3,6,18,0.97)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      color: '#fff',
      fontFamily: '"Google Sans", "Inter", system-ui, sans-serif',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
    }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px 10px',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {tsi?.country ?? selectedIso3}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                {selectedIso3}
              </span>
              {tsi?.classification && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                  background: `${tierColor}22`, color: tierColor,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {tsi.classification}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => digitalTwinStore.selectCountry(null)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
              color: 'rgba(255,255,255,0.5)', width: 28, height: 28,
              cursor: 'pointer', fontSize: 14, flexShrink: 0, marginLeft: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {(['profile', 'ai'] as const).map(t2 => (
            <button key={t2} onClick={() => setTab(t2)} style={{
              flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 600,
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t2 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: tab === t2 ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}>
              {t2 === 'profile' ? '📊 TSI Profile' : '🧠 AI Insight'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>

        {/* Loading */}
        {loading && (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, border: '2px solid rgba(255,255,255,0.08)',
              borderTop: '2px solid #3b82f6', borderRadius: '50%',
              animation: 'cp-spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {t('common.loading', 'Loading…')}
            </span>
            <style>{`@keyframes cp-spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error states */}
        {!loading && error && (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              {error === 'auth' ? '🔒' : '🌐'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {error === 'auth'
                ? 'Session expired'
                : 'Data temporarily unavailable'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              {error === 'auth'
                ? 'Please log in again to access planetary intelligence data.'
                : `No TSI v9 data available for ${selectedIso3}. This country may not be in the current dataset.`}
            </div>
          </div>
        )}

        {/* ── TSI Profile Tab ─────────────────────────── */}
        {!loading && !error && tsi && tab === 'profile' && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Main score hero */}
            <div style={{
              background: 'rgba(255,255,255,0.025)', borderRadius: 10,
              padding: '14px', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    TSI v9 Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 38, fontWeight: 800, color: tsiColor(tsi.tsi), lineHeight: 1, letterSpacing: '-0.03em' }}>
                      {(tsi.tsi * 100).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>/100</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                    #{tsi.rank}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                    Global Rank
                  </div>
                </div>
              </div>
              <ScoreBar value={tsi.tsi} color={tsiColor(tsi.tsi)} />
            </div>

            {/* S vs T */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                System Capacity vs Pressure
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(34,197,94,0.6)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    S — Capacity
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{fmtNum(tsi.S)}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>human + social</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.6)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    T — Pressure
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{fmtNum(tsi.T)}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>planetary stress</div>
                </div>
              </div>
            </div>

            {/* S Components */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                ↑ Capacity Drivers
              </div>
              <ComponentRow label="Human Dev. Index (IHDI)"  value={tsi.s_ihdi} />
              <ComponentRow label="Education Index (EDU)"    value={tsi.s_edu} />
              <ComponentRow label="Governance (GOV)"         value={tsi.s_gov} />
              <ComponentRow label="Ecosystem Services (ESS)" value={tsi.s_ess} />
            </div>

            {/* T Components */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                ↓ Pressure Factors
              </div>
              <ComponentRow label="CO₂ Footprint"      value={tsi.t_co2} />
              <ComponentRow label="Deforestation"       value={tsi.t_defor} />
              <ComponentRow label="Emission Trend"      value={tsi.t_trend} />
              <ComponentRow label="Conflict Risk"       value={tsi.t_conflict} />
            </div>

            {/* Raw indicators grid */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Raw Indicators
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {([
                  ['CO₂ fossil', tsi.co2_fossil, 't/cap'],
                  ['CO₂ total',  tsi.co2_total,  't/cap'],
                  ['Forest',     tsi.forest_pct, '%'],
                  ['Renewables', tsi.renew_pct,  '%'],
                  ['Water',      tsi.water_pct,  '%'],
                  ['IHDI',       tsi.ihdi,       ''],
                  ['Edu years',  tsi.edu_years,  'yr'],
                  ['V-Dem',      tsi.vdem,       ''],
                ] as [string, number|null, string][]).filter(([,v]) => v != null).map(([k, v, unit]) => (
                  <div key={k} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{fmtNum(v as number, 1)}{unit ? ` ${unit}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}

        {/* ── AI Insight Tab ──────────────────────────── */}
        {!loading && !error && tsi && tab === 'ai' && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* AI Narrative */}
            <div style={{
              background: 'rgba(59,130,246,0.06)', borderRadius: 10,
              border: '1px solid rgba(59,130,246,0.15)', padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  GaiaMind AI Analysis
                </span>
                {insight && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: `${riskBadgeColor(insight.risk_level)}22`,
                    color: riskBadgeColor(insight.risk_level), fontWeight: 700,
                  }}>
                    {insight.risk_level} Risk
                  </span>
                )}
              </div>

              {aiLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{
                    width: 14, height: 14, border: '2px solid rgba(96,165,250,0.2)',
                    borderTop: '2px solid #60a5fa', borderRadius: '50%',
                    animation: 'cp-spin 0.8s linear infinite', flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    Generating planetary intelligence analysis…
                  </span>
                </div>
              )}

              {!aiLoading && insight && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0 }}>
                  {insight.summary}
                </p>
              )}

              {!aiLoading && !insight && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  AI narrative unavailable. Backend AI engine may be offline.
                </p>
              )}

              {insight?.confidence != null && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${insight.confidence * 100}%`, background: '#3b82f6', borderRadius: 1 }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                    {(insight.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              )}
            </div>

            {/* Why this score — factor breakdown */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Why this score?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Human Development (IHDI)', value: tsi.s_ihdi, dir: 'positive' },
                  { label: 'Education Index (EDU)',    value: tsi.s_edu,  dir: 'positive' },
                  { label: 'Governance (V-Dem)',       value: tsi.s_gov,  dir: 'positive' },
                  { label: 'Ecosystem Services',       value: tsi.s_ess,  dir: 'positive' },
                  { label: 'CO₂ Pressure',             value: tsi.t_co2,  dir: 'negative' },
                  { label: 'Deforestation',            value: tsi.t_defor, dir: 'negative' },
                  { label: 'Conflict Risk',            value: tsi.t_conflict, dir: 'negative' },
                ].filter(f => f.value != null).map(f => {
                  const isPositive = f.dir === 'positive';
                  const strength = f.value! >= 0.6 ? 'strong' : f.value! >= 0.35 ? 'moderate' : 'weak';
                  const icon = isPositive
                    ? (strength === 'strong' ? '▲▲' : strength === 'moderate' ? '▲' : '△')
                    : (strength === 'strong' ? '▼▼' : strength === 'moderate' ? '▼' : '▽');
                  const color = isPositive ? '#22c55e' : '#ef4444';
                  return (
                    <div key={f.label} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 6,
                      background: `${color}08`, border: `1px solid ${color}12`,
                    }}>
                      <span style={{ color, fontSize: 10, fontWeight: 700, minWidth: 18 }}>{icon}</span>
                      <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{fmtNum(f.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refresh AI */}
            <button onClick={fetchAI} disabled={aiLoading} style={{
              padding: '8px 0', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)',
              background: 'rgba(59,130,246,0.08)', color: '#60a5fa',
              fontSize: 11, fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
              opacity: aiLoading ? 0.5 : 1,
            }}>
              {aiLoading ? '⏳ Analysing…' : '↺ Refresh Analysis'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CountryPanel;
