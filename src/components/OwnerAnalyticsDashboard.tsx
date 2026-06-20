import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Users, MessageSquare, TrendingUp, Activity,
  RefreshCw, UserCheck, Zap, Calendar, Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useDevice } from '../hooks/useDevice';
import { authFetch } from '../services/authFetch';
import '../styles/components.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const W = 560, H = 180, PL = 42, PR = 16, PT = 12, PB = 32;

// Format X label based on granularity
function fmtDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtLabel(date: string, gran: string): string {
  if (gran === 'yearly') return date;
  if (gran === 'monthly') {
    const [y, m] = date.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }
  if (gran === 'weekly') return date.replace(/^\d{4}-/, '');
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

function DauLineChart({ series, maxDau, granularity, noDataLabel, tooltipUsers }: {
  series: { date: string; dau: number }[];
  maxDau: number;
  granularity: string;
  noDataLabel: string;
  tooltipUsers: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ idx: number; mouseX: number; mouseY: number } | null>(null);

  if (series.length === 0)
    return <div style={{ color: 'rgba(224,247,250,0.4)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>{noDataLabel}</div>;

  const n = series.length;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const pts = series.map((d, i) => ({
    x: PL + (i / Math.max(n - 1, 1)) * chartW,
    y: PT + (1 - d.dau / maxDau) * chartH,
    ...d,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H - PB} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[n - 1].x},${H - PB} Z`;

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PT + (1 - t) * chartH,
    label: Math.round(t * maxDau),
  }));

  // X ticks — pick at most ~6 evenly spaced labels
  const maxLabels = Math.min(n, 6);
  const step = Math.max(1, Math.floor(n / maxLabels));
  const xTicks = pts.filter((_, i) => i % step === 0 || i === n - 1);

  // Mouse → index mapping using wrapper width
  // The chart area spans PL..W-PR in SVG coords.
  // In CSS pixels: PL/W * wrapWidth .. (W-PR)/W * wrapWidth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Convert CSS px → SVG x
    const svgX = (mouseX / rect.width) * W;
    // Clamp strictly to chart area
    const cx = Math.max(PL, Math.min(W - PR, svgX));
    // Linear interpolation → index
    const frac = (cx - PL) / chartW;
    const idx = Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1))));
    setTooltip({ idx, mouseX, mouseY });
  };

  const tip = tooltip !== null ? series[tooltip.idx] : null;
  const tipPt = tooltip !== null ? pts[tooltip.idx] : null;

  // Tooltip horizontal flip threshold in CSS px (approx 55% of wrapper)
  const flipThreshold = 0.55;

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'clamp(140px, 30vw, 200px)', display: 'block' }}>
        <defs>
          <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={PL} y={PT} width={chartW} height={chartH + 1} />
          </clipPath>
        </defs>

        {/* full transparent hit area — covers entire SVG including edges */}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />

        {/* X tick labels */}
        {xTicks.map(p => (
          <text className="analytics-axis-text" key={p.date} x={p.x} y={H - PB + 14} textAnchor="middle" fontSize="9" fill="rgba(224,247,250,0.4)">
            {fmtLabel(p.date, granularity)}
          </text>
        ))}
        {xTicks.map(p => (
          <text className="analytics-axis-text" key={p.date} x={p.x} y={H - PB + 14} textAnchor="middle" fontSize="9" fill="rgba(224,247,250,0.4)">
            {fmtLabel(p.date, granularity)}
          </text>
        ))}

        {/* Area + line clipped to chart area */}
        <g clipPath="url(#chartClip)">
          <path d={area} fill="url(#dauGrad)" />
          <polyline className="analytics-chart-line" points={polyline} fill="none" stroke="#00E676" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {/* Hover crosshair + dot (not clipped so dot is fully visible at edges) */}
        {tipPt && (
          <>
            <line className="analytics-crosshair" x1={tipPt.x} y1={PT} x2={tipPt.x} y2={H - PB} stroke="rgba(0,230,118,0.2)" strokeWidth="1" />
            <circle className="analytics-hover-dot" cx={tipPt.x} cy={tipPt.y} r="5" fill="#00E676" stroke="rgba(0,15,30,1)" strokeWidth="2" />
          </>
        )}
      </svg>

      {/* Tooltip — position relative to wrapper div in CSS px */}
      {tip && tooltip && (() => {
        const wrap = wrapRef.current;
        const wW = wrap?.getBoundingClientRect().width ?? 400;
        const flip = tooltip.mouseX / wW > flipThreshold;
        return (
          <div className="analytics-tooltip" style={{
            position: 'absolute',
            top: Math.max(4, tooltip.mouseY - 64),
            left: flip ? tooltip.mouseX - 152 : tooltip.mouseX + 14,
            background: 'rgba(0,12,26,0.97)',
            border: '1px solid rgba(0,230,118,0.45)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.75rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <div className="analytics-tooltip-date" style={{ color: 'rgba(224,247,250,0.5)', fontSize: '0.68rem', marginBottom: '0.1rem' }}>{fmtDate(tip.date)}</div>
            <div className="analytics-tooltip-value" style={{ color: '#00E676', fontSize: '0.9rem', fontWeight: 700 }}>{tip.dau} {tooltipUsers}</div>
          </div>
        );
      })()}
    </div>
  );
}

interface Overview {
  dau: number; wau: number; mau: number;
  mau_growth: number | null; stickiness: number;
  total_users: number; total_messages: number;
  total_conversations: number; avg_messages_per_conversation: number;
  new_users_30d: number; as_of: string;
}
interface DauPoint { date: string; dau: number; }
interface Retention { d1: number | null; d7: number | null; d30: number | null; }
interface TopUser { user_id: string; email: string; messages_30d: number; conversations_30d: number; }

export function OwnerAnalyticsDashboard() {
  const { t } = useTranslation();
  const { getToken, getRole } = useAuth();
  const { isMobile } = useDevice();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dauSeries, setDauSeries] = useState<DauPoint[]>([]);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const defaultStart = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toLocaleDateString('en-CA'); })();
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayStr);
  // pending = what user is typing; applied = what the chart uses
  const [pendingStart, setPendingStart] = useState(defaultStart);
  const [pendingEnd, setPendingEnd] = useState(todayStr);
  const isDirty = pendingStart !== startDate || pendingEnd !== endDate;

  const fetchChart = async (start: string, end: string, gran: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const dau = await authFetch(`${API}/api/analytics/dau-series?start_date=${start}&end_date=${end}&granularity=${gran}`).then(r => r.json());
      setDauSeries(Array.isArray(dau) ? dau : []);
    } catch (e) { console.error(e); }
  };

  const doFetch = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [ov, dau, ret, top] = await Promise.all([
        authFetch(`${API}/api/analytics/overview`).then(r => r.json()),
        authFetch(`${API}/api/analytics/dau-series?start_date=${startDate}&end_date=${endDate}&granularity=${granularity}`).then(r => r.json()),
        authFetch(`${API}/api/analytics/retention`).then(r => r.json()),
        authFetch(`${API}/api/analytics/top-users?limit=8`).then(r => r.json()),
      ]);
      setOverview(ov);
      setDauSeries(Array.isArray(dau) ? dau : []);
      setRetention(ret);
      setTopUsers(Array.isArray(top) ? top : []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doFetch(); }, []);

  if (getRole() !== 'owner') return null;

  const GRAN_OPTIONS: { value: 'daily' | 'weekly' | 'monthly' | 'yearly'; label: string }[] = [
    { value: 'daily',   label: t('analytics.gran_daily')   },
    { value: 'weekly',  label: t('analytics.gran_weekly')  },
    { value: 'monthly', label: t('analytics.gran_monthly') },
    { value: 'yearly',  label: t('analytics.gran_yearly')  },
  ];

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,48,73,0.6)',
    border: '1px solid rgba(0,230,118,0.25)',
    borderRadius: '0.375rem',
    color: 'rgba(224,247,250,0.9)',
    fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
    padding: '0 0.75rem',
    height: 44,
    minHeight: 44,
    cursor: 'pointer',
    colorScheme: 'dark' as React.CSSProperties['colorScheme'],
  };

  const btnStyle: React.CSSProperties = {
    ...inputStyle,
    display: 'inline-flex',
    alignItems: 'center',
  };

  const maxDau = dauSeries.length > 0 ? Math.max(...dauSeries.map(d => d.dau), 1) : 1;
  const maxMsg = topUsers.length > 0 ? Math.max(...topUsers.map(u => u.messages_30d), 1) : 1;

  if (loading && !overview) {
    return (
      <div className="analytics-container component-container">
        <div className="component-wrapper section">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
            <RefreshCw style={{ width: '2rem', height: '2rem', color: '#00E676', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(224, 247, 250, 0.7)', fontSize: '0.875rem' }}>{t('analytics.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container component-container">
      <div className="component-wrapper section">

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)' }}
        >
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <BarChart3 style={{ width: '2rem', height: '2rem' }} />
            <span>{ t('analytics.title') }</span>
          </h1>
          <p className="text-responsive-md" style={{ color: 'rgba(224, 247, 250, 0.7)', maxWidth: '42rem', margin: '0 auto' }}>
            {t('analytics.subtitle')}
            {lastRefresh && ` · ${t('analytics.updated_at', { time: lastRefresh })}`}
          </p>
        </motion.div>

        {/* KPI Principal — DAU / WAU / MAU / Stickiness / Novos */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-responsive"
        >
          <div className="card-base">
            <h2 style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{t('analytics.active_users')}</span>
            </h2>
            <div className="grid-auto">
              {[
                { label: 'DAU',                           sub: t('analytics.kpi_today'),         value: overview?.dau ?? 0,              icon: Activity  },
                { label: 'WAU',                           sub: t('analytics.kpi_7days'),         value: overview?.wau ?? 0,              icon: Calendar  },
                { label: 'MAU',                           sub: t('analytics.kpi_30days'),        value: overview?.mau ?? 0,              icon: Users     },
                { label: t('analytics.kpi_stickiness'),   sub: t('analytics.kpi_dau_mau'),       value: `${overview?.stickiness ?? 0}%`, icon: Zap       },
                { label: t('analytics.kpi_new_30d'),      sub: t('analytics.kpi_registrations'), value: overview?.new_users_30d ?? 0,   icon: UserCheck },
              ].map(({ label, sub, value, icon: Icon }) => (
                <div key={label} style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', background: 'rgba(0,48,73,0.6)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Icon style={{ width: '1rem', height: '1rem', color: '#00E676', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(224,247,250,0.6)', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  </div>
                  <div style={{ color: '#00E676', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700 }}>{value}</div>
                  <div style={{ color: 'rgba(224,247,250,0.4)', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', marginTop: '0.25rem' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Totais Globais */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-responsive"
        >
          <div className="card-base">
            <h2 style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{t('analytics.global_totals')}</span>
            </h2>
            <div className="grid-auto">
              {[
                { label: t('analytics.total_users'),         value: overview?.total_users ?? 0,                   icon: Users,         sub: undefined },
                { label: t('analytics.total_messages'),      value: overview?.total_messages ?? 0,                icon: MessageSquare, sub: undefined },
                { label: t('analytics.total_conversations'), value: overview?.total_conversations ?? 0,           icon: BarChart3,     sub: undefined },
                { label: t('analytics.msg_per_conv'),        value: overview?.avg_messages_per_conversation ?? 0, icon: TrendingUp,    sub: t('analytics.average') },
              ].map(({ label, value, icon: Icon, sub }) => (
                <div key={label} style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', background: 'rgba(0,48,73,0.6)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Icon style={{ width: '1rem', height: '1rem', color: '#00E676', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(224,247,250,0.6)', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)' }}>{label}</span>
                  </div>
                  <div style={{ color: '#00E676', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700 }}>{value}</div>
                  {sub && <div style={{ color: 'rgba(224,247,250,0.4)', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', marginTop: '0.25rem' }}>{sub}</div>}
                </div>
              ))}
            </div>
            {overview?.mau_growth != null && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(0, 48, 73, 0.4)', borderRadius: '0.375rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'rgba(224, 247, 250, 0.6)' }}>{t('analytics.mau_growth')}</span>
                <strong style={{ color: overview.mau_growth >= 0 ? '#00E676' : '#f87171', fontWeight: 600 }}>
                  {overview.mau_growth >= 0 ? '+' : ''}{overview.mau_growth}%
                </strong>
              </div>
            )}
          </div>
        </motion.div>

        {/* DAU Chart */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-responsive"
        >
          <div className="card-base">
            {/* Title + granularity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <h2 style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                <Activity style={{ width: '1.25rem', height: '1.25rem' }} />
                <span>{t('analytics.chart_title')}</span>
              </h2>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {GRAN_OPTIONS.map(g => (
                  <button className="analytics-filter-btn" key={g.value} onClick={() => {
                    setGranularity(g.value);
                    fetchChart(startDate, endDate, g.value);
                  }} style={{
                    ...btnStyle,
                    borderColor: granularity === g.value ? '#00E676' : 'rgba(0,230,118,0.25)',
                    background: granularity === g.value ? 'rgba(0,230,118,0.15)' : 'rgba(0,48,73,0.6)',
                    color: granularity === g.value ? '#00E676' : 'rgba(224,247,250,0.5)',
                    fontWeight: granularity === g.value ? 600 : 400,
                    transition: 'all 0.15s',
                  }}>{g.label}</button>
                ))}
              </div>
            </div>
            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(224,247,250,0.5)', fontSize: '0.75rem' }}>{t('analytics.from')}</span>
              <input type="date" value={pendingStart} max={pendingEnd} style={inputStyle} onChange={e => setPendingStart(e.target.value)} />
              <span style={{ color: 'rgba(224,247,250,0.5)', fontSize: '0.75rem' }}>{t('analytics.to')}</span>
              <input type="date" value={pendingEnd} min={pendingStart} max={todayStr} style={inputStyle} onChange={e => setPendingEnd(e.target.value)} />
              {isDirty && (
                <button className="analytics-apply-btn" onClick={() => { setStartDate(pendingStart); setEndDate(pendingEnd); fetchChart(pendingStart, pendingEnd, granularity); }}
                  style={{ ...btnStyle, background: 'rgba(0,230,118,0.2)', borderColor: '#00E676', color: '#00E676', fontWeight: 600 }}>
                  {t('analytics.apply')}
                </button>
              )}
              <button className="analytics-reset-btn" onClick={() => { setPendingStart(defaultStart); setPendingEnd(todayStr); setStartDate(defaultStart); setEndDate(todayStr); fetchChart(defaultStart, todayStr, granularity); }}
                style={{ ...btnStyle, color: 'rgba(224,247,250,0.4)' }}>{t('analytics.reset')}</button>
            </div>
            <DauLineChart series={dauSeries} maxDau={maxDau} granularity={granularity} noDataLabel={t('analytics.no_data')} tooltipUsers={t('analytics.tooltip_users')} />
          </div>
        </motion.div>

        {/* Retenção */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-responsive"
        >
          <div className="card-base">
            <h2 style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserCheck style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{t('analytics.retention_title')}</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { label: t('analytics.retention_d1'),  value: retention?.d1  },
                { label: t('analytics.retention_d7'),  value: retention?.d7  },
                { label: t('analytics.retention_d30'), value: retention?.d30 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(224, 247, 250, 0.7)', fontSize: '0.875rem' }}>{label}</span>
                    <strong style={{ color: '#00E676', fontWeight: 600, fontSize: '0.875rem' }}>
                      {value != null ? `${value}%` : 'N/A'}
                    </strong>
                  </div>
                  <div className="analytics-progress-bg" style={{ width: '100%', background: 'rgba(0, 48, 73, 0.6)', borderRadius: '9999px', height: '8px' }}>
                    <div className="analytics-progress-fill" style={{
                      height: '8px', borderRadius: '9999px',
                      background: 'rgba(0, 230, 118, 0.7)',
                      width: value != null ? `${value}%` : '0%',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              ))}
              <p style={{ color: 'rgba(224, 247, 250, 0.3)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {t('analytics.retention_note')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Top Utilizadores */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-responsive"
        >
          <div className="card-base">
            <h2 style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{t('analytics.top_users_title')}</span>
            </h2>
            {topUsers.length === 0 ? (
              <div style={{ color: 'rgba(224, 247, 250, 0.4)', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>{t('analytics.no_top_users')}</div>
            ) : (
              <div className="list-responsive">
                {topUsers.map((u, i) => (
                  <div key={u.user_id} className="list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                      <div className={`analytics-avatar-bg ${i === 0 ? 'top-1' : ''}`} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: i === 0 ? 'rgba(0,230,118,0.3)' : 'rgba(0,48,73,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className={`analytics-avatar-text ${i === 0 ? 'top-1' : ''}`} style={{ color: i === 0 ? '#00E676' : 'rgba(224,247,250,0.4)', fontSize: '0.75rem', fontWeight: 700 }}>{i + 1}</span>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'rgba(224, 247, 250, 1)', fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        <div className="analytics-progress-bg" style={{ width: '100%', background: 'rgba(0,48,73,0.6)', borderRadius: '9999px', height: '4px', marginTop: '0.375rem' }}>
                          <div className="analytics-progress-fill" style={{ height: '4px', borderRadius: '9999px', background: 'rgba(0,230,118,0.6)', width: `${(u.messages_30d / maxMsg) * 100}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '0.125rem' }}>
                      <span style={{ color: '#00E676', fontSize: '0.875rem', fontWeight: 600 }}>{u.messages_30d} msg</span>
                      <span style={{ color: 'rgba(224,247,250,0.4)', fontSize: '0.75rem' }}>{u.conversations_30d} conv.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Refresh Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}
        >
          <button
            onClick={() => doFetch()}
            className="btn-responsive btn-primary"
            disabled={loading}
          >
            <RefreshCw style={{ width: '1rem', height: '1rem', ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            {t('analytics.refresh')}
          </button>
        </motion.div>

      </div>
    </div>
  );
}
