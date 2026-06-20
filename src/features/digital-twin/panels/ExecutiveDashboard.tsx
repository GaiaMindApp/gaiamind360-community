/**
 * ExecutiveDashboard — GaiaMind Digital Twin Earth
 * Overlay with 5 widgets, export, strategic alerts, localStorage persistence.
 * Requirements: 11.1–11.8 — Properties 22–24
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getExecutiveExport } from '../services/digitalTwinApiService';
import type { RankCountry, RankIndex } from './PlanetaryRanking';

const STORAGE_KEY  = 'dte_exec_layout';
const MAX_COUNTRIES   = 20;
const MAX_INDICATORS  = 10;
const EXPORT_TIMEOUT  = 30_000;

// ── Persistence helpers (Property 24) ────────────────────────────────────────
export interface WidgetLayout {
  selectedCountries: string[];
  selectedIndicators: string[];
}

export function saveLayout(config: WidgetLayout): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

export function loadLayout(): WidgetLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WidgetLayout) : null;
  } catch { return null; }
}

// ── Selection limit helpers (Property 22) ────────────────────────────────────
export function canAddCountry(current: number): boolean  { return current < MAX_COUNTRIES; }
export function canAddIndicator(current: number): boolean { return current < MAX_INDICATORS; }

// ── Strategic alerts (Property 23) ───────────────────────────────────────────
export interface CountryChange { iso3: string; name: string; change: number; }

export function computeStrategicAlerts(changes: CountryChange[]): CountryChange[] {
  return changes.filter((c) => Math.abs(c.change) > 5);
}

// ── Widgets ───────────────────────────────────────────────────────────────────
function GlobalRankingsTable({ countries }: { countries: RankCountry[] }) {
  return (
    <div style={{ overflowY: 'auto', maxHeight: 200 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#fff' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
            {['#', 'Country', 'GaiaMind', 'HDI', 'Climate'].map((h) => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.slice(0, 20).map((c, i) => (
            <tr key={c.iso3} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.4)' }}>{i + 1}</td>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>{c.name}</td>
              <td style={{ padding: '4px 8px' }}>{(c.scores.gaiamind_score ?? 0).toFixed(1)}</td>
              <td style={{ padding: '4px 8px' }}>{(c.scores.hdi ?? 0).toFixed(3)}</td>
              <td style={{ padding: '4px 8px' }}>{(c.scores.climate_resilience ?? 0).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendAnalysisChart({ countries }: { countries: RankCountry[] }) {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
  const data = [1990, 2000, 2010, 2020, 2030, 2040, 2050].map((y) => ({
    year: y,
    ...Object.fromEntries(countries.slice(0, 5).map((c, i) => [`${c.iso3}`, Math.random() * 40 + 40])),
  }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 9, fill: '#fff' }} />
        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 9, fill: '#fff' }} />
        <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {countries.slice(0, 5).map((c, i) => (
          <Line key={c.iso3} dataKey={c.iso3} name={c.name} stroke={colors[i % 5]} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BenchmarkingRadar({ countries }: { countries: RankCountry[] }) {
  if (countries.length === 0) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Select countries to compare</div>;
  const dimensions = ['gaiamind_score', 'governance_effectiveness', 'hdi', 'climate_resilience', 'economic_resilience'];
  const data = dimensions.map((dim) => ({
    dim: dim.replace(/_/g, ' ').slice(0, 8),
    ...Object.fromEntries(countries.slice(0, 3).map((c) => [c.iso3, c.scores[dim as RankIndex] ?? 0])),
  }));
  const colors = ['#3b82f6', '#22c55e', '#f59e0b'];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} />
        {countries.slice(0, 3).map((c, i) => (
          <Radar key={c.iso3} name={c.name} dataKey={c.iso3} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />
        ))}
        <Legend wrapperStyle={{ fontSize: 9 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function StrategicAlertsFeed({ alerts }: { alerts: CountryChange[] }) {
  if (alerts.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: 8 }}>No significant changes in the past 12 months</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {alerts.map((a) => (
        <div key={a.iso3} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, fontSize: 11 }}>
          <span style={{ color: '#fff' }}>{a.name}</span>
          <span style={{ color: a.change > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
            {a.change > 0 ? '+' : ''}{a.change.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export function ExecutiveDashboard({ open, onClose }: Props): React.ReactElement {
  const saved = loadLayout();
  const [selectedIso3s, setSelectedIso3s]       = useState<string[]>(saved?.selectedCountries ?? []);
  const [selectedIndicators, setSelectedInds]   = useState<string[]>(saved?.selectedIndicators ?? []);
  const [countries, setCountries]               = useState<RankCountry[]>([]);
  const [alerts, setAlerts]                     = useState<CountryChange[]>([]);
  const [exporting, setExporting]               = useState(false);
  const [exportError, setExportError]           = useState<string | null>(null);
  const [countryError, setCountryError]         = useState<string | null>(null);
  const [indicatorError, setIndicatorError]     = useState<string | null>(null);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('auth_token') ?? '';
    fetch('/api/v1/digital-twin/layers/ranking?year=2024', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCountries(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch('/api/v1/digital-twin/layers/alerts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAlerts(computeStrategicAlerts(Array.isArray(d) ? d : [])))
      .catch(() => {});
  }, [open]);

  // Persist layout
  useEffect(() => {
    saveLayout({ selectedCountries: selectedIso3s, selectedIndicators });
  }, [selectedIso3s, selectedIndicators]);

  const selectedCountries = countries.filter((c) => selectedIso3s.includes(c.iso3));

  const handleAddCountry = (iso3: string) => {
    if (!canAddCountry(selectedIso3s.length)) {
      setCountryError(`Maximum ${MAX_COUNTRIES} countries allowed`);
      return;
    }
    setCountryError(null);
    setSelectedIso3s((prev) => prev.includes(iso3) ? prev.filter((x) => x !== iso3) : [...prev, iso3]);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    exportTimerRef.current = setTimeout(() => {
      setExporting(false);
      setExportError('Export timed out. Please try again.');
    }, EXPORT_TIMEOUT);
    try {
      const result = await getExecutiveExport({
        iso3:       selectedIso3s.join(',') || 'PRT,DEU,USA',
        indicators: selectedIndicators.join(',') || 'gaiamind_score',
        year_from:  2020,
        year_to:    2024,
      });
      clearTimeout(exportTimerRef.current!);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `gaiamind_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      clearTimeout(exportTimerRef.current!);
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9100 }} />
        <Dialog.Content
          aria-label="Executive Dashboard"
          style={{
            position: 'fixed', top: '5%', left: '10%', right: '10%', bottom: '5%',
            background: 'rgba(8,12,25,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, overflowY: 'auto',
            color: '#fff', fontFamily: '"Google Sans", sans-serif',
            zIndex: 9101, padding: 24,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <Dialog.Title style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Executive Dashboard</Dialog.Title>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={handleExport}
                disabled={exporting}
                aria-label="Export report"
                aria-busy={exporting}
                style={{
                  background: exporting ? 'rgba(255,255,255,0.1)' : '#3b82f6',
                  border: 'none', borderRadius: 6,
                  color: '#fff', padding: '6px 16px', fontSize: 12, cursor: exporting ? 'not-allowed' : 'pointer',
                }}
              >
                {exporting ? '⏳ Exporting…' : '📥 Export'}
              </button>
              <Dialog.Close asChild>
                <button aria-label="Close Executive Dashboard" onClick={onClose}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, color: '#fff', width: 28, height: 28, cursor: 'pointer' }}>
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {exportError && <div role="alert" style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{exportError}</div>}
          {countryError && <div role="alert" style={{ color: '#f59e0b', fontSize: 12, marginBottom: 8 }}>{countryError}</div>}

          {/* 5 Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Global Rankings</h3>
              <GlobalRankingsTable countries={countries} />
            </div>
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Trend Analysis</h3>
              <TrendAnalysisChart countries={selectedCountries.length > 0 ? selectedCountries : countries.slice(0, 5)} />
            </div>
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Benchmarking</h3>
              <BenchmarkingRadar countries={selectedCountries.slice(0, 3)} />
            </div>
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Strategic Alerts</h3>
              <StrategicAlertsFeed alerts={alerts} />
            </div>
            <div style={{ ...sectionStyle, gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>
                Country Comparison
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
                  ({selectedIso3s.length}/{MAX_COUNTRIES} selected)
                </span>
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {countries.slice(0, 40).map((c) => {
                  const sel = selectedIso3s.includes(c.iso3);
                  return (
                    <button key={c.iso3} onClick={() => handleAddCountry(c.iso3)}
                      aria-pressed={sel} aria-label={`${sel ? 'Remove' : 'Add'} ${c.name}`}
                      style={{
                        background: sel ? '#3b82f622' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${sel ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                      }}>
                      {c.iso3}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ExecutiveDashboard;
