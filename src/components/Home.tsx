import { useState, useEffect, CSSProperties, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wind, ThermometerSun, Leaf, Zap, RefreshCw } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceArea, LineChart, Line } from 'recharts';
import { RotatingEarth } from './RotatingEarth';
import { useHomeData } from '../hooks/useHomeData';
import CO2EmissionsChart from './CO2EmissionsChart';
import { useDevice } from '../hooks/useDevice';
import { authFetch } from '../services/authFetch';
import { initAntiAdware } from '../utils/antiAdware';
import { getTsiClass, getRiskLevelClass, getRiskDotClass } from '../utils/riskTableClasses';
import '../styles/components.css';
import '../styles/home2.css';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Prediction {
  country: string;
  code: string;
  co2_current: number;
  co2_next_pred: number;
  trend: string;
  trend_real: string;
  pct_change: number;
  pct_change_display: string;
  trend_label: string;
  uncertainty_pct: number;
  prob_increase: number;
  display_confidence: number;
  insight_type: string;
  horizon_label?: string;
  directional_confidence?: number;
  conditions?: string[];
  drivers_display?: string[];
  scenarios?: { baseline: number; green_acceleration: number; economic_stress: number };
  segment?: string;
  co2_history?: { year: number; value: number }[];
}

function PredictiveSection({ riskMap }: { riskMap: any[] }) {
  const { t } = useTranslation();
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`${BASE}/api/global-data/ml/predictions/co2`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setPreds(data.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h2-forecast-card"><Skeleton /></div>;
  if (!preds.length) return <p style={{ color: 'rgba(224,247,250,0.35)', fontSize: '0.82rem' }}>{t('home.predictive.no_data')}</p>;

  // ── KPI bar ──────────────────────────────────────────────────────────────
  const avgChange = preds.length
    ? preds.reduce((s, p) => s + (p.pct_change ?? 0), 0) / preds.length
    : 0;
  const decliningCount = preds.filter(p => p.trend_real === 'decrease').length;
  const stableCount    = preds.filter(p => p.trend_real === 'stable').length;
  const avgConf        = preds.length
    ? Math.round(preds.reduce((s, p) => s + (p.display_confidence ?? 0), 0) / preds.length)
    : 0;

  const kpiCards = [
    { label: 'Avg Change',       value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%`, color: avgChange < 0 ? '#00e676' : '#f87171' },
    { label: 'Declining',        value: String(decliningCount),                                  color: '#00e676' },
    { label: 'Stable',           value: String(stableCount),                                     color: '#4fc3f7' },
    { label: 'Avg Confidence',   value: `${avgConf}%`,                                           color: '#ffd54f' },
  ];

  // ── Segment grouping ──────────────────────────────────────────────────────
  const segmentOrder = ['Accelerated Decline', 'Moderate Decline', 'Stable / Plateau', 'Moderate Increase', 'Accelerated Increase'];
  const grouped: Record<string, Prediction[]> = {};
  for (const p of preds) {
    const seg = p.segment ?? 'Other';
    if (!grouped[seg]) grouped[seg] = [];
    grouped[seg].push(p);
  }
  const orderedSegments = [
    ...segmentOrder.filter(s => grouped[s]),
    ...Object.keys(grouped).filter(s => !segmentOrder.includes(s)),
  ];

  // ── Insight box ───────────────────────────────────────────────────────────
  const decliners = preds.filter(p => p.trend_real === 'decrease');
  const biggestDecliner = decliners.sort((a, b) => (a.pct_change ?? 0) - (b.pct_change ?? 0))[0];
  const china = preds.find(p => p.code === 'CHN');
  const insightText = decliners.length > 0
    ? `${decliners.length} of ${preds.length} monitored economies show moderate-to-accelerated decarbonization trends over the 3-year horizon.${biggestDecliner ? ` ${biggestDecliner.country} leads with ${Math.abs(biggestDecliner.pct_change ?? 0).toFixed(1)}% reduction.` : ''}${china ? ' China remains in stabilization phase.' : ''}`
    : `${preds.length} monitored economies tracked over the 3-year horizon. No significant decarbonization trend detected in current cycle.`;

  const maxVal = Math.max(...preds.flatMap(p => [p.co2_current, p.co2_next_pred]));

  const trendColor = (tr: string) =>
    tr === 'decrease' ? '#00e676' : tr === 'stable' ? '#4fc3f7' : '#f87171';

  const trendArrow = (tr: string) =>
    tr === 'decrease' ? '↓' : tr === 'stable' ? '~' : '↑';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── KPI bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{
            background: 'rgba(13, 31, 45, 0.8)',
            border: '1px solid rgba(79, 195, 247, 0.15)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
          }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(224, 247, 250, 0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.label}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* ── Segment groups ── */}
      {orderedSegments.map(seg => (
        <div key={seg}>
          {/* Segment header */}
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
            color: 'rgba(224, 247, 250, 0.4)', textTransform: 'uppercase',
            borderBottom: '1px solid rgba(79, 195, 247, 0.1)',
            paddingBottom: '0.4rem', marginBottom: '0.75rem',
          }}>
            {seg}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {grouped[seg].map((p, i) => {
              const tr       = p.trend_real ?? 'stable';
              const tc       = trendColor(tr);
              const barNow   = (p.co2_current / maxVal) * 100;
              const barNext  = (p.co2_next_pred / maxVal) * 100;
              const sc       = p.scenarios;
              const drivers  = p.drivers_display ?? p.conditions ?? [];
              const history  = p.co2_history ?? [];

              return (
                <div key={p.country} className="fade-up" style={{
                  background: 'rgba(13, 31, 45, 0.8)',
                  border: '1px solid rgba(79, 195, 247, 0.15)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  animationDelay: `${i * 0.04}s`,
                }}>
                  {/* Row 1: country + sparkline + values + pct + badge + uncertainty */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>

                    {/* Country name */}
                    <div style={{ minWidth: '90px', flex: '0 0 90px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E0F7FA' }}>{p.country}</span>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,247,250,0.35)', marginTop: '1px' }}>{p.code}</div>
                    </div>

                    {/* Dual bar */}
                    <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(224,247,250,0.35)', width: '28px' }}>NOW</span>
                        <div style={{ flex: 1, height: '5px', background: 'rgba(224,247,250,0.06)', borderRadius: 3 }}>
                          <div style={{ width: `${barNow}%`, height: '100%', background: '#64748b', borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(224,247,250,0.35)', width: '28px' }}>PROJ</span>
                        <div style={{ flex: 1, height: '5px', background: 'rgba(224,247,250,0.06)', borderRadius: 3 }}>
                          <div style={{ width: `${barNext}%`, height: '100%', background: tc, borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    </div>

                    {/* Values */}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(224,247,250,0.6)', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                      {p.co2_current.toFixed(1)}t → <span style={{ color: tc }}>{p.co2_next_pred.toFixed(1)}t</span>
                    </div>

                    {/* pct_change_display with arrow */}
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: tc, whiteSpace: 'nowrap', paddingTop: '2px' }}>
                      {trendArrow(tr)} {p.pct_change_display ?? `${Math.abs(p.pct_change ?? 0).toFixed(1)}%`}
                    </div>

                    {/* trend_label badge */}
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 600,
                      color: tc, background: `${tc}18`,
                      border: `1px solid ${tc}40`,
                      borderRadius: '4px', padding: '2px 7px',
                      whiteSpace: 'nowrap',
                    }}>
                      {p.trend_label ?? 'Stable'}
                    </div>

                    {/* Uncertainty */}
                    <div style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.4)', whiteSpace: 'nowrap', paddingTop: '3px' }}>
                      ± {p.uncertainty_pct ?? '—'}%
                    </div>

                    {/* Sparkline */}
                    {history.length > 1 && (
                      <div style={{ width: 80, height: 32, flexShrink: 0 }}>
                        <LineChart width={80} height={32} data={history}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={tc}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Scenarios */}
                  {sc && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Baseline',    val: sc.baseline,           color: '#4fc3f7' },
                        { label: 'Green ↑',     val: sc.green_acceleration, color: '#00e676' },
                        { label: 'Stress',      val: sc.economic_stress,    color: '#ffd54f' },
                      ].map(s => (
                        <div key={s.label} style={{
                          fontSize: '0.65rem', color: s.color,
                          background: `${s.color}12`,
                          border: `1px solid ${s.color}30`,
                          borderRadius: '4px', padding: '2px 8px',
                          whiteSpace: 'nowrap',
                        }}>
                          {s.label}: {s.val >= 0 ? '+' : ''}{s.val.toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row 3: Drivers */}
                  {drivers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {drivers.map((d, di) => (
                        <span key={di} style={{
                          fontSize: '0.65rem', color: 'rgba(224,247,250,0.45)',
                          background: 'rgba(224,247,250,0.05)',
                          border: '1px solid rgba(224,247,250,0.08)',
                          borderRadius: '3px', padding: '1px 6px',
                        }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Insight box ── */}
      <div style={{
        background: 'rgba(0, 230, 118, 0.05)',
        border: '1px solid rgba(0, 230, 118, 0.2)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#00e676', letterSpacing: '0.08em', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
          AI Insight · 3-Year Horizon
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(224, 247, 250, 0.7)', lineHeight: 1.6, margin: 0 }}>
          {insightText}
        </p>
      </div>

      <p style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.2)', marginTop: '0.25rem' }}>
        {t('home.predictive.note')}
      </p>
    </div>
  );
}

// ── STATIC CONFIG ────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  { key: 'co2ppm',          labelKey: 'home.kpi.co2ppm',       unit: ' ppm', icon: Wind,          accent: '#f87171',  riskThreshold: { high: 420, medium: 415 } },
  { key: 'co2',             labelKey: 'home.kpi.co2',          unit: ' t',  icon: ThermometerSun, accent: '#FFD54F',  riskThreshold: { high: 10, medium: 6 } },
  { key: 'biodiversity',    labelKey: 'home.kpi.biodiversity', unit: '%',   icon: Leaf,           accent: '#00E676',  riskThreshold: { high: 25,  medium: 40  }, invert: true },
  { key: 'renewableEnergy', labelKey: 'home.kpi.renewableEnergy', unit: '%',   icon: Zap,            accent: '#4FC3F7',  riskThreshold: { high: 20,  medium: 35  }, invert: true },
];

const FORECASTS = [
  { titleKey: 'home.forecasts.co2.title', descriptionKey: 'home.forecasts.co2.description' },
  { titleKey: 'home.forecasts.renewables.title', descriptionKey: 'home.forecasts.renewables.description' },
];

const POLICIES = [
  { titleKey: 'home.policies.eu_ets.title', descKey: 'home.policies.eu_ets.desc', pct: '-35%', pctLabelKey: 'home.policies.eu_ets.pct_label', source: 'European Environment Agency' },
  { titleKey: 'home.policies.costa_rica.title', descKey: 'home.policies.costa_rica.desc', pct: '+52%', pctLabelKey: 'home.policies.costa_rica.pct_label', source: 'FAO Forest Resources Assessment' },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getKpiRisk(value: number | null, cfg: typeof KPI_CONFIG[0]): { labelKey: string; cls: string } {
  if (value === null) return { labelKey: 'home.kpi.risk_status.none', cls: '' };
  const { high, medium } = cfg.riskThreshold;
  const isHigh   = cfg.invert ? value < high   : value > high;
  const isMedium = cfg.invert ? value < medium  : value > medium;
  if (isHigh)   return { labelKey: 'home.kpi.risk_status.high',   cls: 'h2-risk-high' };
  if (isMedium) return { labelKey: 'home.kpi.risk_status.medium', cls: 'h2-risk-medium' };
  return              { labelKey: 'home.kpi.risk_status.low',    cls: 'h2-risk-low' };
}

function SectionHeader({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="h2-section-header">
      <span className="h2-section-tag">{tag}</span>
      <h2 className="h2-section-title">{title}</h2>
      <div className="h2-section-line" />
    </div>
  );
}


function Skeleton() {
  return <div style={{ height: '1.2rem', borderRadius: 4, background: 'rgba(0,230,118,0.08)', animation: 'h2-pulse 1.5s ease-in-out infinite' }} />;
}

const MemoizedPredictiveSection = memo(PredictiveSection)

// ── COMPONENT ────────────────────────────────────────────────────────────────

export function Home() {
  const { t } = useTranslation();
  useEffect(() => { initAntiAdware(); }, []);
  const d = useHomeData();
  const { isMobile } = useDevice();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [riskSearch, setRiskSearch] = useState('');
  const [allCountries, setAllCountries] = useState<typeof d.riskMap>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [tsiData, setTsiData] = useState<Record<string, { tsi_score: number; tsi_class: string; S_score: number; T_score: number }>>({});
  const [tsiParetoData, setTsiParetoData] = useState([]);
  const [loadingTsiPareto, setLoadingTsiPareto] = useState(true);

  // Carregar dados para o Gráfico de Pareto do TSI
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    // Endpoint público — usar fetch direto para evitar redirect em caso de token expirado
    const token = (() => { try { const s = localStorage.getItem('gaiamind-auth'); return s ? JSON.parse(s).token : null; } catch { return null; } })();
    fetch(`${BASE}/api/tsi/pareto-data`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => {
        if (!res.ok) {
          console.warn('[Pareto] API returned', res.status);
          return null;
        }
        return res.json();
      })
      .then(data => {
        console.log('[Pareto] data received:', data?.chart_data?.length, 'points');
        setTsiParetoData(data?.chart_data ?? []);
        setLoadingTsiPareto(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('[Pareto] fetch error:', err);
        }
        setLoadingTsiPareto(false);
      })
      .finally(() => clearTimeout(timeoutId));
  }, []);

  // Carregar dados TSI v9
  useEffect(() => {
    authFetch(`${BASE}/api/tsi/merged`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.data) return;
        const map: Record<string, any> = {};
        data.data.forEach((row: any) => {
          if (row.code && row.tsi_score != null) {
            map[row.code] = {
              tsi_score: row.tsi_score,
              tsi_class: row.tsi_class,
              S_score:   row.S_score,
              T_score:   row.T_score,
            };
          }
        });
        setTsiData(map);
      })
      .catch(() => {});
  }, []);

  // Carrega todos os 228 países quando o utilizador começa a pesquisar
  const handleRiskSearch = async (value: string) => {
    setRiskSearch(value);
    if (value.length > 0 && allCountries.length === 0 && !allLoading) {
      setAllLoading(true);
      try {
        const res = await authFetch(`${BASE}/api/insights/countries`);
        if (res.ok) {
          const data = await res.json();
          const ALERT_COLOR: Record<string, string> = {
            CRITICAL: '#FF2222', HIGH: '#FF4444', WATCHLIST: '#FF8C42',
            MEDIUM: '#FFD54F', LOW: '#00E676',
          };
          const allCountries_mapped = data.map((c: any) => ({
            country: c.country || c.code,
            code: c.code || '',
            score: Math.round(c.score_current ?? 0),
            alertLevel: c.alert_level || 'LOW',
            risk: c.alert_level || 'LOW',
            barColor: ALERT_COLOR[c.alert_level] ?? '#00E676',
          }));
          setAllCountries(allCountries_mapped);
        }
      } catch { /* silencioso */ }
      finally { setAllLoading(false); }
    }
  };

  // Lista a mostrar: se há pesquisa usa allCountries, senão usa os top 8 com dados completos
  const displayedRiskMap = riskSearch
    ? (allCountries.length > 0 ? allCountries : d.riskMap)
        .filter(row => {
          const q = riskSearch.toLowerCase().trim()
          // Aliases PT/ES para países comuns
          const ALIASES: Record<string, string[]> = {
            'united states': ['eua', 'usa', 'estados unidos', 'america'],
            'united kingdom': ['reino unido', 'uk', 'gbr', 'grã-bretanha'],
            'germany': ['alemanha', 'deu', 'alemania'],
            'france': ['frança', 'fra', 'francia'],
            'brazil': ['brasil', 'bra'],
            'china': ['chn', 'república popular'],
            'russia': ['rússia', 'rus'],
            'japan': ['japão', 'jpn', 'japón'],
            'india': ['índia', 'ind'],
            'australia': ['aus'],
            'portugal': ['prt'],
            'spain': ['espanha', 'esp', 'españa'],
            'italy': ['itália', 'ita', 'italia'],
          }
          const name = row.country.toLowerCase()
          const code = (row.code || '').toLowerCase()
          if (name.includes(q) || code.includes(q)) return true
          // Verificar aliases
          for (const [canonical, aliases] of Object.entries(ALIASES)) {
            if (aliases.includes(q) && name.includes(canonical)) return true
          }
          return false
        })
    : (() => {
        // Mostrar apenas países com TODOS os campos preenchidos (score > 0 + TSI)
        if (Object.keys(tsiData).length === 0) return d.riskMap.slice(0, 8);
        const complete = d.riskMap.filter(r => r.score > 0 && tsiData[r.code]);
        if (complete.length >= 8) return complete.slice(0, 8);
        // Fallback: completar com os restantes
        const rest = d.riskMap.filter(r => !complete.includes(r));
        return [...complete, ...rest].slice(0, 8);
      })();

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenu) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenu]);

  const scoreColor  = !d.gaiaScore ? '#FFD54F' : d.gaiaScore >= 70 ? '#00E676' : d.gaiaScore >= 40 ? '#FFD54F' : '#f87171';
  const scoreStatus = !d.gaiaScore
    ? t('home.score.status.none')
    : d.gaiaScore >= 70 ? t('home.score.status.stable')
    : d.gaiaScore >= 40 ? t('home.score.status.warning')
    : t('home.score.status.critical');
  const scoreStatusClass = !d.gaiaScore ? 'h2-status-warning' : d.gaiaScore >= 70 ? 'h2-status-stable' : d.gaiaScore >= 40 ? 'h2-status-warning' : 'h2-status-critical';
  const circumference = 2 * Math.PI * 54;

  const telemetry = [
    { label: t('home.telemetry.ai_models_running'),   value: d.loading ? '…' : String(d.modelsRunning) },
    { label: t('home.telemetry.datasets_analyzed'),   value: d.loading ? '…' : d.datasetsAnalyzed > 0 ? d.datasetsAnalyzed.toLocaleString() : '—' },
    { label: t('home.telemetry.countries_monitored'), value: d.loading ? '…' : String(d.countriesMonitored) },
    { label: t('home.telemetry.last_update'),         value: d.loading ? '…' : d.lastUpdate },
  ];

  const menuItemStyle: CSSProperties = {
    color: 'rgba(224, 247, 250, 0.9)',
    textDecoration: 'none',
    padding: '0.4rem 0.6rem',
    fontSize: '0.75rem',
    borderRadius: '4px',
    display: 'block',
  };

  return (
    <div className="component-container">

      {/* ── 1. HERO ── */}
      <section className="h2-hero">
        <div className="h2-hero-bg" />

        <div className="h2-hero-left fade-up">
          <div className="h2-system-badge">
            <span className="h2-system-badge-dot" />
            {t('home.hero.badge', { status: d.loading ? t('home.hero.loading') : t('home.hero.live') })}
          </div>

          <h1 className="h2-hero-title">
            {t('home.hero.title_main')}<br />
            <span>{t('home.hero.title_sub')}</span>
          </h1>
          <p className="h2-hero-subtitle">
            {t('home.hero.subtitle_line_1', { indicators: d.loading ? '…' : d.datasetsAnalyzed.toLocaleString() })}{' '}
            {t('home.hero.subtitle_line_2', { countries: d.loading ? '…' : d.countriesMonitored.toLocaleString() })}
          </p>

          <div className="h2-telemetry">
            {telemetry.map((t) => (
              <div key={t.label} className="h2-tele-row">
                <span className="h2-tele-label">{t.label}</span>
                <span className="h2-tele-value">{t.value}</span>
              </div>
            ))}
          </div>

          {d.error && (
            <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.75rem' }}>
              ⚠ {d.error} — {t('home.hero.cached_data')}
            </p>
          )}
        </div>

        <div className="h2-gaia-score-wrap fade-up">
          <RotatingEarth />

          <div className="h2-gaia-score-ring">
            <svg width="100%" height="100%" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(224,247,250,0.06)" strokeWidth="8" />
              {d.gaiaScore !== null && (
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(d.gaiaScore / 100) * circumference} ${circumference}`}
                  strokeDashoffset={circumference * 0.25}
                  style={{ filter: `drop-shadow(0 0 6px ${scoreColor})`, transition: 'stroke-dasharray 1s ease' }}
                />
              )}
            </svg>
            <div className="h2-gaia-score-inner">
              <span className="h2-gaia-score-num" style={{ color: scoreColor }}>
                {d.loading ? '…' : d.gaiaScore ?? '—'}
              </span>
              <span className="h2-gaia-score-label">{t('home.score.label')}</span>
            </div>
          </div>

          <span className={`h2-gaia-score-status ${scoreStatusClass}`}>{scoreStatus}</span>
        </div>
      </section>

      <div className="h2-divider" />

      {/* ── 2. GLOBAL INDICATORS ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.indicators.tag')} title={t('home.sections.indicators.title')} />
        <div className="h2-kpi-grid">
          {KPI_CONFIG.map((cfg, i) => {
            const Icon = cfg.icon;
            const value = d[cfg.key as keyof typeof d] as number | null;
            const { labelKey: riskLabelKey, cls: riskCls } = getKpiRisk(value, cfg);
            const displayVal = value !== null ? `${value.toFixed(1)}${cfg.unit}` : '—';
            return (
              <div key={cfg.key} className="fade-up" style={{ position: 'relative' }}>
                <div className="h2-kpi-card" style={{ '--kpi-accent': cfg.accent } as React.CSSProperties}>
                  <div className="h2-kpi-top">
                    <div className="h2-kpi-icon-wrap" style={{ background: `${cfg.accent}18` }}>
                      <Icon size={18} style={{ color: cfg.accent }} />
                    </div>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(224,247,250,0.35)', letterSpacing: '0.05em' }}>
                      {t('home.kpi.live')}
                    </span>
                  </div>
                  <div className="h2-kpi-value">{d.loading ? <Skeleton /> : displayVal}</div>
                  <div className="h2-kpi-label">{t(cfg.labelKey)}</div>
                  <div className="h2-kpi-footer">
                    <span className={`h2-kpi-risk ${riskCls}`}>{t('home.kpi.risk', { label: t(riskLabelKey) })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h2-divider" />

      {/* ── 3. AI INTELLIGENCE ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.intelligence.tag')} title={t('home.sections.intelligence.title')} />
        {d.loading ? (
          <div className="h2-intel-grid">{[0,1,2].map(i => <div key={i} className="h2-intel-card"><Skeleton /></div>)}</div>
        ) : d.insights.length === 0 ? (
          <p style={{ color: 'rgba(224,247,250,0.35)', fontSize: '0.82rem' }}>{t('home.intelligence.no_data')}</p>
        ) : (
          <div className="h2-intel-grid">
            {d.insights.map((ins, i) => {
              const typeClass = ins.type === 'ANOMALY' ? 'h2-type-anomaly' : ins.type === 'RISK' ? 'h2-type-risk' : 'h2-type-positive';
              return (
                <div key={ins.title} className="fade-up">
                  <div className="h2-intel-card">
                    <div className="h2-intel-header">
                      <span className={`h2-intel-type ${typeClass}`}>{ins.type}</span>
                    </div>
                    <div className="h2-intel-title">{ins.title}</div>
                    <div className="h2-intel-body">{ins.body}</div>
                    <div className="h2-intel-meta">
                      <span>{ins.region}</span>
                      <div className="h2-confidence">
                        <span>{t('home.intelligence.confidence', { value: ins.confidence })}</span>
                        <div className="h2-conf-bar">
                          <div className="h2-conf-fill" style={{ width: `${ins.confidence}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="h2-divider" />

      {/* ── 3.5. TSI PARETO CHART ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('tsi.title')} title={t('tsi.subtitle')} />

        {/* Legenda */}
        {!loadingTsiPareto && tsiParetoData.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', marginBottom: '0.25rem' }}>
            {[
              { label: 'Highly Sustainable',    color: '#00e676' },
              { label: 'Approaching Sustainable', color: '#4fc3f7' },
              { label: 'Transitioning',          color: '#ffd54f' },
              { label: 'At Risk',                color: '#ff9800' },
              { label: 'Unsustainable',          color: '#f87171' },
            ].map(({ label, color }) => {
              const count = tsiParetoData.filter((p: any) => p.classification === label).length;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(224,247,250,0.65)', whiteSpace: 'nowrap' }}>
                    {label} <span style={{ color, fontWeight: 700 }}>({count})</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="h2-pareto-wrap w-full bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-800 mt-2">
          {loadingTsiPareto ? (
            <div className="flex h-full items-center justify-center text-emerald-400">
              {t('tsi.loading')}
            </div>
          ) : tsiParetoData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400 text-sm">
              {t('tsi.no_data', 'No data available')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 40, bottom: 50, left: 50 }}>

                <XAxis
                  type="number"
                  dataKey="S"
                  name={t('tsi.wellbeing')}
                  domain={[0, 1]}
                  stroke="#4fc3f7"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: t('tsi.wellbeing_axis'), position: 'insideBottom', offset: -30, fill: '#4fc3f7', fontSize: 12 }}
                />

                <YAxis
                  type="number"
                  dataKey="T"
                  name={t('tsi.pressure')}
                  domain={[0, 2]}
                  stroke="#4fc3f7"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: t('tsi.pressure_axis'), angle: -90, position: 'insideLeft', offset: 15, fill: '#4fc3f7', fontSize: 12 }}
                />

                <ZAxis range={[40, 40]} />

                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload;
                      const colorMap: Record<string, string> = {
                        'Highly Sustainable':     '#00e676',
                        'Approaching Sustainable': '#4fc3f7',
                        'Transitioning':           '#ffd54f',
                        'At Risk':                 '#ff9800',
                        'Unsustainable':           '#f87171',
                      };
                      const c = colorMap[pt.classification] ?? '#94a3b8';
                      return (
                        <div style={{ background: '#0d2233', border: `1px solid ${c}40`, borderRadius: 8, padding: '10px 14px', color: '#E0F7FA', fontSize: 13, minWidth: 180 }}>
                          <p style={{ fontWeight: 700, color: c, marginBottom: 4 }}>{pt.country}</p>
                          <p style={{ color: 'rgba(224,247,250,0.6)', fontSize: 11, marginBottom: 6 }}>{pt.classification}</p>
                          <p>{t('tsi.wellbeing')}: <span style={{ fontFamily: 'monospace', color: '#4fc3f7' }}>{Number(pt.S).toFixed(3)}</span></p>
                          <p>{t('tsi.pressure')}: <span style={{ fontFamily: 'monospace', color: '#ffd54f' }}>{Number(pt.T).toFixed(3)}</span></p>
                          <p>TSI: <span style={{ fontFamily: 'monospace', color: '#00e676' }}>{Number(pt.tsi).toFixed(3)}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Zonas semânticas — Doughnut Economics */}
                <ReferenceArea x1={0.5} x2={1}   y1={0} y2={1}   fill="#00e676" fillOpacity={0.06} />
                <ReferenceArea x1={0.5} x2={1}   y1={1} y2={2}   fill="#ffd54f" fillOpacity={0.06} />
                <ReferenceArea x1={0}   x2={0.5} y1={0} y2={1}   fill="#ff9800" fillOpacity={0.06} />
                <ReferenceArea x1={0}   x2={0.5} y1={1} y2={2}   fill="#f87171" fillOpacity={0.08} />

                {/* Um Scatter por classificação para cores diferentes */}
                {[
                  { label: 'Highly Sustainable',     color: '#00e676', stroke: '#00c853' },
                  { label: 'Approaching Sustainable', color: '#4fc3f7', stroke: '#0288d1' },
                  { label: 'Transitioning',           color: '#ffd54f', stroke: '#f9a825' },
                  { label: 'At Risk',                 color: '#ff9800', stroke: '#e65100' },
                  { label: 'Unsustainable',           color: '#f87171', stroke: '#c62828' },
                ].map(({ label, color, stroke }) => (
                  <Scatter
                    key={label}
                    name={label}
                    data={tsiParetoData.filter((p: any) => p.classification === label)}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      if (cx == null || cy == null) return <circle cx={0} cy={0} r={0} />;
                      return (
                        <circle
                          cx={cx} cy={cy} r={5}
                          fill={color} fillOpacity={0.88}
                          stroke={stroke} strokeWidth={1}
                        />
                      );
                    }}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="h2-divider" />

      {/* ── 4. PREDICTIVE MODELS ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.predictive.tag')} title={t('home.sections.predictive.title')} />
        <MemoizedPredictiveSection riskMap={d.riskMap} />
      </section>

      <div className="h2-divider" />

      {/* ── 5. GLOBAL RISK MAP ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.risk_map.tag')} title={t('home.sections.risk_map.title')} />
        <div className="card-base" style={{ padding: 0, overflowX: 'auto' }}>
          {d.loading ? (
            <div style={{ padding: '1.5rem' }}><Skeleton /></div>
          ) : d.riskMap.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'rgba(224,247,250,0.35)', fontSize: '0.82rem' }}>{t('home.risk_map.no_data')}</p>
          ) : (
            <>
              <div style={{ padding: '0.75rem 1rem 0' }}>
                <input
                  value={riskSearch}
                  onChange={e => handleRiskSearch(e.target.value)}
                  placeholder={`Search all ${d.countriesMonitored} countries...`}
                  style={{
                    width: '100%', padding: '0.45rem 0.75rem',
                    background: 'rgba(224,247,250,0.05)',
                    border: '1px solid rgba(224,247,250,0.12)',
                    borderRadius: '6px', color: '#E0F7FA',
                    fontSize: '0.8rem', outline: 'none',
                  }}
                />
                {allLoading && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.35)', marginTop: '0.25rem', display: 'block' }}>
                    Loading all countries...
                  </span>
                )}
                {!riskSearch && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.3)', marginTop: '0.25rem', display: 'block' }}>
                    Showing top 8 by risk priority · Search to see all {d.countriesMonitored}
                  </span>
                )}
              </div>
                <table className="h2-risk-table" style={{ minWidth: '520px' }}>
                <thead>
                  <tr>
                    <th>{t('home.risk_map.country')}</th>
                    <th>{t('home.risk_map.gaia_score')}</th>
                    <th>{t('home.risk_map.risk_level')}</th>
                    <th>{t('home.risk_map.index')}</th>
                    <th style={{ color: '#00E676' }}>TSI v9</th>
                    <th style={{ color: '#4FC3F7', fontSize: '0.65rem' }}>S / T</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRiskMap.map((row, i) => {
                    const code = row.code || '';
                    const tsi  = tsiData[code];
                    const tsiClass = tsi ? getTsiClass(tsi.tsi_class) : '';
                    const riskClass = getRiskLevelClass(row.alertLevel || row.risk);
                    const dotClass = getRiskDotClass(row.alertLevel || row.risk);
                    
                    return (
                      <tr key={row.country} className="risk-row-animate" style={{ animationDelay: `${Math.min(i * 0.04, 0.32)}s` }}>
                        <td style={{ fontWeight: 600 }}>
                          {row.country}
                          {row.code && riskSearch && (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.4)', marginLeft: '0.4rem' }}>{row.code}</span>
                          )}
                        </td>
                        <td>
                          <div className="h2-score-bar-wrap">
                            <div className="h2-score-bar">
                              <div className="h2-score-bar-fill" style={{ width: `${row.score}%`, background: row.barColor }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(224,247,250,0.6)' }}>{row.score}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`h2-risk-dot ${dotClass}`} />
                          <span className={riskClass}>{row.alertLevel || row.risk}</span>
                        </td>
                        <td className={riskClass}>{row.score}/100</td>
                        <td className={tsiClass}>
                          {tsi ? `${tsi.tsi_score.toFixed(1)}` : '—'}
                          {tsi && (
                            <span style={{ fontSize: '0.6rem', marginLeft: '0.3rem', opacity: 0.7 }}>
                              {tsi.tsi_class}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.72rem', color: 'rgba(224,247,250,0.5)' }}>
                          {tsi ? (
                            <span title={`System: ${tsi.S_score.toFixed(0)} | Pressure: ${tsi.T_score.toFixed(0)}`}>
                              <span className="score-s">{tsi.S_score.toFixed(0)}</span>
                              <span style={{ opacity: 0.4 }}>/</span>
                              <span className="score-t">{tsi.T_score.toFixed(0)}</span>
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {displayedRiskMap.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '1rem', color: 'rgba(224,247,250,0.35)', fontSize: '0.82rem', textAlign: 'center' }}>
                      {allLoading ? 'Loading...' : 'No countries found'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </section>

      <div className="h2-divider" />

      {/* ── 6. POLICY SIMULATION ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.simulation.tag')} title={t('home.sections.simulation.title')} />
        <div className="h2-policy-grid">
          {POLICIES.map((p, i) => (
            <div key={p.titleKey} className="fade-up">
              <div className="h2-policy-card">
                <div className="h2-policy-title">{t(p.titleKey)}</div>
                <div className="h2-policy-desc">{t(p.descKey)}</div>
                <div className="h2-policy-result">
                  <span className="h2-policy-pct">{p.pct}</span>
                  <span className="h2-policy-pct-label">{t(p.pctLabelKey)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h2-divider" />

      {/* ── 7. RESEARCH & DATA ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.research.tag')} title={t('home.sections.research.title')} />
        {d.loading ? (
          <div className="h2-research-grid">{[0,1,2].map(i => <div key={i} className="h2-research-card"><Skeleton /></div>)}</div>
        ) : d.research.length === 0 ? (
          <p style={{ color: 'rgba(224,247,250,0.35)', fontSize: '0.82rem' }}>{t('home.research.no_data')}</p>
        ) : (
          <div className="h2-research-grid">
            {d.research.map((r, i) => (
              <div key={r.title} className="fade-up">
                <div className="h2-research-card">
                  <span className="h2-research-type">{r.type}</span>
                  <div className="h2-research-title">{r.title}</div>
                  <div className="h2-research-meta">{r.meta}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h2-divider" />

      {/* ── 8. CO2 EMISSIONS CHART ── */}
      <section className="h2-section fade-up">
        <SectionHeader tag={t('home.sections.co2.tag')} title={t('home.sections.co2.title')} />
        <CO2EmissionsChart />
      </section>

      <div className="h2-divider" />

      {/* ── 9. SYSTEM ACTIVITY ── */}
      <section className="h2-section fade-up">
        <div className="h2-section-header">
          <span className="h2-section-tag">{t('home.sections.activity.tag')}</span>
          <h2 className="h2-section-title">{t('home.sections.activity.title')}</h2>
          <div className="h2-section-line" />
          <span style={{ fontSize: '0.65rem', color: 'rgba(224,247,250,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <RefreshCw size={10} /> {t('home.sections.activity.auto_refresh')}
          </span>
        </div>
        <div className="card-base">
          <div className="h2-feed">
            {d.feed.map((item, i) => (
              <div key={i} className="h2-feed-item fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <span className="h2-feed-dot" style={{ background: item.dotColor, boxShadow: `0 0 5px ${item.dotColor}80` }} />
                <span className="h2-feed-time">{item.time}</span>
                <span className="h2-feed-text">{item.text}</span>
                <span className="h2-feed-tag" style={item.tagStyle}>{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
