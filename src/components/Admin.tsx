import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Cpu, Globe2, Clock, RefreshCw,
  Zap, Brain, BarChart3, Server, Repeat, Activity, CheckCircle, XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../hooks/useDevice';
import { authFetch } from '../services/authFetch';
import AdminRealDataService, { AIMetrics, APIHealthStatus } from '../services/adminRealDataService';
import '../styles/components.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type ApiTestStatus = 'idle' | 'loading' | 'ok' | 'error';

interface ApiEntry {
  name: string;
  url: string;
  detail: string;
  category: string;
  status: ApiTestStatus;
  time?: number;
}

const GLOBAL_APIS: Omit<ApiEntry, 'status'>[] = [
  { name: 'World Bank API',      url: 'api.worldbank.org',              detail: 'api_detail_wb',        category: 'api_cat_data' },
  { name: 'NASA POWER API',      url: 'power.larc.nasa.gov',            detail: 'api_detail_nasa',      category: 'api_cat_climate' },
  { name: 'Open-Meteo Weather',  url: 'api.open-meteo.com',             detail: 'api_detail_meteo',     category: 'api_cat_climate' },
  { name: 'NASA FIRMS',          url: 'firms.modaps.eosdis.nasa.gov',   detail: 'api_detail_firms',     category: 'api_cat_environment' },
  { name: 'OpenAQ v3',           url: 'api.openaq.org',                 detail: 'api_detail_openaq',    category: 'api_cat_environment' },
  { name: 'Copernicus Marine',   url: 'marine-api.open-meteo.com',      detail: 'api_detail_copernicus',category: 'api_cat_environment' },
  { name: 'Global Forest Watch', url: 'data-api.globalforestwatch.org', detail: 'api_detail_gfw',       category: 'api_cat_environment' },
  { name: 'UNEP SDG API',        url: 'unstats.un.org/sdgs',            detail: 'api_detail_unep',      category: 'api_cat_data' },
  { name: 'GaiaMind Backend',    url: 'localhost:8000',                 detail: 'api_detail_backend',   category: 'api_cat_system' },
];

const CAT_COLOR: Record<string, string> = {
  api_cat_data: '#3b82f6', api_cat_climate: '#06b6d4', api_cat_environment: '#22c55e', api_cat_system: '#a855f7',
};

const S = {
  h1: { color: '#00E676', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 700, margin: 0 } as React.CSSProperties,
  h2: { color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', fontWeight: 700, margin: 0 } as React.CSSProperties,
  label: { color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  value: { color: '#E0F7FA', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const },
  body: { color: 'rgba(224,247,250,0.7)', fontSize: 'clamp(0.8rem, 2vw, 0.875rem)', lineHeight: 1.6 },
  card: { background: 'rgba(0,48,73,0.4)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '0.75rem', padding: 'clamp(1rem, 3vw, 1.5rem)' } as React.CSSProperties,
  metricCard: { background: 'rgba(0,48,73,0.6)', borderRadius: '0.5rem', padding: 'clamp(0.75rem, 2vw, 1rem)', display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  sectionGap: { display: 'flex', flexDirection: 'column' as const, gap: 'clamp(1rem, 3vw, 1.5rem)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' as const },
  divider: { height: '1px', background: 'rgba(0,230,118,0.12)', margin: '0.25rem 0' },
};

const spinKeyframe = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
if (typeof document !== 'undefined' && !document.getElementById('admin-spin-style')) {
  const s = document.createElement('style'); s.id = 'admin-spin-style'; s.textContent = spinKeyframe; document.head.appendChild(s);
}

function formatAgo(ts: string, t: (k: string, o?: any) => string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return t('admin.ago_moments');
    if (diff < 60) return t('admin.ago_minutes', { n: diff });
    const h = Math.floor(diff / 60);
    if (h < 24) return t('admin.ago_hours', { n: h });
    return t('admin.ago_days', { n: Math.floor(h / 24) });
  } catch {
    return '—';
  }
}

interface SystemHealth {
  backend: boolean;
  database: boolean;
  redis: boolean;
  llm_queue: { active: number; queued: number; max: number } | null;
  pipeline_ready: boolean;
  rag_docs: number;
}

interface PipelineMetrics {
  cap_range: string;
  countries_covered: number;
  ppo_enabled: boolean;
  active_alerts: number;
  last_run: string;
  pipeline_score: number;
}

function MetricGrid({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
      {items.map((item) => (
        <div key={item.label} className="metric-card" style={S.metricCard}>
          <span className="metric-label" style={S.label}>{item.label}</span>
          <span className="metric-value" style={{ ...S.value, color: item.color || '#00E676' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: 'clamp(0.875rem, 2vw, 1.25rem)' }}>
      <span className="admin-card-title-icon" style={{ color: '#00E676', display: 'flex' }}>{icon}</span>
      <h2 className="admin-card-title" style={S.h2}>{title}</h2>
    </div>
  );
}

function SystemStatusSection({ health, loading, onRefresh }: { health: SystemHealth | null; loading: boolean; onRefresh: () => void }) {
  const { t } = useTranslation()
  const services = [
    { label: t('admin.svc_backend'),  ok: health?.backend ?? null,        detail: t('admin.svc_backend_detail') },
    { label: t('admin.svc_postgres'), ok: health?.database ?? null,       detail: t('admin.svc_postgres_detail') },
    { label: t('admin.svc_redis'),    ok: health?.redis ?? null,          detail: t('admin.svc_redis_detail') },
    { label: t('admin.svc_pipeline'), ok: health?.pipeline_ready ?? null, detail: health?.pipeline_ready ? t('admin.svc_pipeline_ready') : t('admin.svc_pipeline_pending') },
  ];
  const allOk = health && health.backend && health.database && health.redis;
  const overallColor = !health ? '#FFD166' : allOk ? '#00E676' : '#F87171';
  const overallLabel = !health ? t('admin.checking') : allOk ? t('admin.all_operational') : t('admin.degraded');

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
      <div className="admin-card" style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Server size={18} color="#00E676" />
            <div>
              <h2 className="admin-card-title" style={S.h2}>{t('admin.system_status_title')}</h2>
              <p className="admin-subtitle" style={{ ...S.body, margin: 0, color: 'rgba(224,247,250,0.55)' }}>{t('admin.system_status_desc')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: overallColor, fontSize: '0.82rem', fontWeight: 600 }}>
              <span className={`api-status-dot ${allOk ? 'connected' : 'error'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: overallColor, boxShadow: `0 0 6px ${overallColor}` }} />
              {overallLabel}
            </span>
            <button
              disabled={loading}
              onClick={onRefresh}
              className="admin-button-secondary"
              style={{ borderRadius: '0.6rem', border: '1px solid rgba(0,230,118,0.25)', background: 'transparent', color: '#00E676', padding: '0 1rem', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1, fontSize: '0.875rem' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? t('admin.refreshing') : t('admin.refresh')}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(140px, 40%, 200px), 1fr))', gap: '0.75rem' }}>
          {services.map((service) => (
            <div key={service.label} className="metric-card" style={{ ...S.metricCard, flexDirection: 'row', alignItems: 'center', gap: '0.75rem', minHeight: 56 }}>
              <span className={`api-status-dot ${service.ok === null ? 'error' : service.ok ? 'connected' : 'disconnected'}`} style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: service.ok === null ? '#FFD166' : service.ok ? '#00E676' : '#F87171',
                boxShadow: `0 0 6px ${service.ok === null ? '#FFD166' : service.ok ? '#00E676' : '#F87171'}`,
              }} />
              <div>
                <div className="metric-value" style={{ color: '#E0F7FA', fontSize: '0.9rem', fontWeight: 600 }}>{service.label}</div>
                <div className="metric-label" style={{ color: 'rgba(224,247,250,0.45)', fontSize: '0.75rem', textTransform: 'none' }}>{service.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {health?.llm_queue && (
          <div className="metrics-details" style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(0,230,118,0.12)', background: 'rgba(0,48,73,0.55)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <Zap size={15} color="#FFD166" />
              <span className="metric-value" style={{ color: '#E0F7FA', fontWeight: 700, fontSize: '0.9rem' }}>{t('admin.llm_queue')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { label: t('admin.llm_active'), value: health.llm_queue.active, color: health.llm_queue.active > 0 ? '#FFD166' : '#00E676' },
                { label: t('admin.llm_queued'), value: health.llm_queue.queued },
                { label: t('admin.llm_max'), value: health.llm_queue.max, color: '#E0F7FA' },
              ].map((q) => (
                <div key={q.label} className="metric-card" style={S.metricCard}>
                  <span className="metric-label" style={S.label}>{q.label}</span>
                  <span className="metric-value" style={{ ...S.value, color: q.color || '#00E676' }}>{q.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {health && !health.llm_queue && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(224,247,250,0.4)', fontSize: '0.8rem' }}>
            <Zap size={13} />
            {t('admin.llm_no_data')}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AIEngineSection({ metrics }: { metrics: AIMetrics | null }) {
  const { t } = useTranslation()
  const isActive = !!metrics;
  const statusColor = isActive ? '#00E676' : '#FFD166';

  const items = [
    { label: t('admin.ai_latency'), value: metrics ? `${metrics.latency_ms.toFixed(0)} ms` : '—', color: metrics && metrics.latency_ms > 2000 ? '#F87171' : '#00E676' },
    { label: t('admin.ai_requests'), value: metrics ? String(metrics.requests_today) : '—' },
    { label: t('admin.ai_errors'), value: metrics ? String(metrics.errors_today) : '—', color: metrics?.errors_today ? '#F87171' : '#00E676' },
    { label: t('admin.ai_cost'), value: metrics ? `$${metrics.cost_per_1k_tokens.toFixed(4)}` : '—', color: '#E0F7FA' },
    { label: t('admin.ai_uptime'), value: metrics ? `${metrics.uptime_percent.toFixed(1)}%` : '—', color: metrics && metrics.uptime_percent < 95 ? '#FFD166' : '#00E676' },
    { label: t('admin.ai_updated'), value: metrics ? formatAgo(metrics.last_updated, t) : '—', color: '#E0F7FA' },
  ];

  const providers = ['GPT-4o', 'Gemini 1.5 Pro', 'Groq LLaMA 3.3', 'Ollama Local'];

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
      <div className="admin-card" style={S.card}>
        <SectionHeader icon={<Brain size={18} />} title={t('admin.ai_engine_title')} />

        {/* modelo activo + badge */}
        <div className="ai-model-display" style={{ ...S.metricCard, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ minWidth: 0 }}>
              <div className="model-name" style={{ color: '#00E676', fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {metrics?.model_name ?? '—'}
              </div>
              <div className="model-provider" style={{ color: 'rgba(224,247,250,0.55)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                {metrics?.provider ?? t('admin.ai_waiting')}
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '999px', border: `1px solid ${statusColor}44`, background: `${statusColor}12`, padding: '0.5rem 0.85rem', flexShrink: 0 }}>
              <span className={`api-status-dot ${isActive ? 'connected' : 'error'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
              <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                {isActive ? t('admin.ai_active') : t('admin.ai_connecting')}
              </span>
            </div>
          </div>
        </div>

        {/* métricas */}
        <MetricGrid items={items} />

        <div style={{ ...S.divider, margin: '1rem 0' }} />

        {/* fallback chain */}
        <div>
          <span className="metric-label" style={{ ...S.label, display: 'block', marginBottom: '0.5rem' }}>{t('admin.ai_fallback_chain')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {providers.map((p, i) => (
              <span key={p} style={{
                borderRadius: '999px',
                border: `1px solid ${metrics?.provider === p ? '#00E676' : 'rgba(0,230,118,0.15)'}`,
                background: metrics?.provider === p ? 'rgba(0,230,118,0.1)' : 'transparent',
                color: metrics?.provider === p ? '#00E676' : 'rgba(224,247,250,0.55)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: metrics?.provider === p ? 700 : 400,
              }}>
                {i + 1}. {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PipelineIntelligenceSection({ metrics }: { metrics: PipelineMetrics | null }) {
  const { t } = useTranslation()
  const isFallback = !metrics;
  const values = metrics ?? {
    cap_range: 'Cap2–Cap7',
    countries_covered: 228,
    ppo_enabled: true,
    active_alerts: 6,
    last_run: '5m ago',
    pipeline_score: 91,
  };

  const scoreColor = values.pipeline_score >= 90 ? '#00E676' : values.pipeline_score >= 70 ? '#FFD166' : '#F87171';

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
      <div className="admin-card" style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 'clamp(0.875rem, 2vw, 1.25rem)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span className="admin-card-title-icon" style={{ color: '#00E676', display: 'flex' }}><BarChart3 size={18} /></span>
            <h2 className="admin-card-title" style={S.h2}>{t('admin.pipeline_title')}</h2>
          </div>
          {isFallback && (
            <span style={{ fontSize: '0.72rem', color: '#FFD166', border: '1px solid rgba(255,209,102,0.3)', borderRadius: '999px', padding: '0.25rem 0.65rem' }}>
              {t('admin.pipeline_cached')}
            </span>
          )}
        </div>

        {/* 4 métricas principais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(110px, 25%, 160px), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { label: t('admin.pipeline_caps'), value: values.cap_range, color: '#00E676' },
            { label: t('admin.pipeline_countries'), value: `${values.countries_covered}`, color: '#C8FFD1' },
            { label: t('admin.pipeline_ppo'), value: values.ppo_enabled ? t('admin.pipeline_ppo_enabled') : t('admin.pipeline_ppo_paused'), color: values.ppo_enabled ? '#00E676' : '#FFD166' },
            { label: t('admin.pipeline_alerts'), value: `${values.active_alerts}`, color: values.active_alerts > 0 ? '#F87171' : '#00E676' },
          ].map((item) => (
            <div key={item.label} className="metric-card" style={S.metricCard}>
              <span className="metric-label" style={S.label}>{item.label}</span>
              <span className="metric-value" style={{ ...S.value, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* score bar + last run */}
        <div className="metrics-details" style={{ ...S.metricCard, gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-value" style={{ color: '#E0F7FA', fontWeight: 600, fontSize: '0.875rem' }}>{t('admin.pipeline_score')}</span>
            <span style={{ color: scoreColor, fontWeight: 700, fontSize: '0.875rem' }}>{values.pipeline_score}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,230,118,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${values.pipeline_score}%`, background: scoreColor, borderRadius: 999, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(224,247,250,0.45)', fontSize: '0.78rem' }}>
            <Clock size={12} />
            {t('admin.pipeline_updated')} {typeof values.last_run === 'string' && values.last_run.includes('T') ? formatAgo(values.last_run, t) : values.last_run}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ExternalAPIsSection({ apis, onResync }: { apis: APIHealthStatus[]; onResync: (apiName: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ApiEntry[]>(GLOBAL_APIS.map(a => ({ ...a, status: 'idle' })));
  const [testing, setTesting] = useState(false);

  // sincronizar health do backend com as entradas
  useEffect(() => {
    if (!apis.length) return;
    setEntries(prev => prev.map(e => {
      const found = apis.find(a => a.name === e.name);
      if (!found) return e;
      return {
        ...e,
        status: found.status === 'connected' ? 'ok' : found.status === 'disconnected' ? 'error' : 'error',
        time: found.response_time_ms ?? undefined,
      };
    }));
  }, [apis]);

  const runTests = async () => {
    setTesting(true);
    setEntries(prev => prev.map(e => ({ ...e, status: 'loading' })));
    try {
      const r = await authFetch(`${API_BASE}/api/env/test-apis`);
      if (r.ok) {
        const data: Array<{ name: string; status: string; time_ms: number }> = await r.json();
        setEntries(prev => prev.map(e => {
          const found = data.find(d => d.name === e.name);
          if (!found) return { ...e, status: 'idle' };
          return { ...e, status: found.status === 'ok' ? 'ok' : 'error', time: found.time_ms };
        }));
      } else {
        setEntries(prev => prev.map(e => ({ ...e, status: 'error' })));
      }
    } catch {
      setEntries(prev => prev.map(e => ({ ...e, status: 'error' })));
    }
    setTesting(false);
  };

  const statusIcon = (s: ApiTestStatus) => {
    if (s === 'idle')    return <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />;
    if (s === 'loading') return <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #00E676', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />;
    if (s === 'ok')      return <CheckCircle size={14} color="#4ade80" style={{ flexShrink: 0 }} />;
    return <XCircle size={14} color="#f87171" style={{ flexShrink: 0 }} />;
  };

  const okCount  = entries.filter(e => e.status === 'ok').length;
  const errCount = entries.filter(e => e.status === 'error').length;
  const tested   = entries.filter(e => e.status !== 'idle').length;

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
      <div className="admin-card" style={S.card}>
        <SectionHeader icon={<Globe2 size={18} />} title={t('admin.apis_title')} />

        {/* barra de acções */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={runTests}
            disabled={testing}
            className="admin-button-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', minHeight: 44, padding: '0 1rem', borderRadius: '0.6rem', border: '1px solid rgba(0,230,118,0.25)', background: 'transparent', color: '#00E676', cursor: testing ? 'default' : 'pointer', opacity: testing ? 0.65 : 1, fontSize: '0.875rem' }}
          >
            <Activity size={14} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} />
            {testing ? t('admin.apis_testing') : t('admin.apis_test_all')}
          </button>
          {tested > 0 && (
            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.78rem' }}>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>✓ {okCount} OK</span>
              {errCount > 0 && <span style={{ color: '#f87171', fontWeight: 600 }}>✗ {errCount} {t('admin.apis_failed')}</span>}
              <span style={{ color: 'rgba(224,247,250,0.35)' }}>{tested}/{GLOBAL_APIS.length}</span>
            </div>
          )}
        </div>

        {/* APIs agrupadas por categoria */}
        {['api_cat_data', 'api_cat_climate', 'api_cat_environment', 'api_cat_system'].map(cat => {
          const catEntries = entries.filter(e => e.category === cat);
          return (
            <div key={cat} style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLOR[cat], flexShrink: 0 }} />
                <span style={{ fontSize: '0.65rem', color: CAT_COLOR[cat], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t(`admin.${cat}`)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {catEntries.map(api => (
              <div key={api.name} className="api-item" style={{
                    ...S.metricCard,
                    flexDirection: 'row', alignItems: 'center', gap: '0.65rem',
                    borderLeft: `2px solid ${api.status === 'ok' ? '#4ade8044' : api.status === 'error' ? '#f8717144' : 'rgba(0,230,118,0.1)'}`,
                    padding: '0.65rem 0.75rem',
                  }}>
                    {statusIcon(api.status)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="api-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E0F7FA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{api.name}</div>
                  <div className="metric-label" style={{ fontSize: '0.68rem', color: 'rgba(224,247,250,0.4)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'none' }}>{t(`admin.${api.detail}`)}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 48 }}>
                      {api.status === 'ok'      && <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>{api.time}ms</span>}
                  {api.status === 'error'   && <span className="api-error" style={{ fontSize: '0.72rem', color: '#f87171' }}>{t('admin.api_status_failed')}</span>}
                  {api.status === 'idle'    && <span className="api-empty" style={{ fontSize: '0.72rem', color: 'rgba(224,247,250,0.2)' }}>—</span>}
                      {api.status === 'loading' && <span style={{ fontSize: '0.72rem', color: '#00E676' }}>...</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* resync do backend health */}
        {apis.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onResync('all')}
              className="admin-button-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minHeight: 44, padding: '0 0.9rem', borderRadius: '0.6rem', border: '1px solid rgba(0,230,118,0.18)', background: 'transparent', color: 'rgba(0,230,118,0.7)', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              <Repeat size={12} /> {t('admin.apis_resync')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ToastBanner({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(0,48,73,0.95)', border: '1px solid rgba(0,230,118,0.18)', borderRadius: '0.75rem', padding: '1rem 1.2rem', color: '#E0F7FA', zIndex: 50, minWidth: 260, boxShadow: '0 16px 40px rgba(0,0,0,0.18)' }}>
      {message}
    </motion.div>
  );
}

export default function Admin() {
  const { t } = useTranslation()
  const { isMobile, isTablet } = useDevice();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [apiHealth, setApiHealth] = useState<APIHealthStatus[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [statusResult, apiResult] = await Promise.all([
        AdminRealDataService.getAdminStatus(),
        AdminRealDataService.getAPIHealth(),
      ]);

      if ((statusResult as any).system_health) {
        setHealth((statusResult as any).system_health as SystemHealth);
      }

      if ((statusResult as any).pipeline_metrics) {
        setPipelineMetrics((statusResult as any).pipeline_metrics as PipelineMetrics);
      }

      setMetrics(statusResult.ai_metrics ?? null);
      setApiHealth(apiResult ?? []);
      showToast(t('admin.toast_refreshed'));
    } catch (error) {
      console.error('Failed to refresh admin dashboard', error);
      showToast(t('admin.toast_load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const intervalId = window.setInterval(refreshAll, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleResync = async (apiName: string) => {
    setLoading(true);
    try {
      await AdminRealDataService.resyncAPI(apiName);
      await refreshAll();
      showToast(t('admin.toast_resynced', { name: apiName }));
    } catch {
      showToast(t('admin.toast_resync_error', { name: apiName }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container component-container">
      <div className="component-wrapper section">
        {toast && <ToastBanner message={toast} />}

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)' }}
        >
          <h1 className="section-title admin-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem' }}>
            <Cpu size={28} color="#00E676" />
            Admin Dashboard
          </h1>
          <p className="text-responsive-md admin-subtitle" style={{ color: 'rgba(224,247,250,0.7)', maxWidth: '42rem', margin: '0 auto' }}>
            {t('admin.subtitle')}
          </p>
        </motion.div>

        {/* Summary cards */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="mb-responsive">
          <div className="grid-2">
          <div className="card-base admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
              <span className="metric-label" style={S.label}>{t('admin.last_update')}</span>
              <div className="metric-value" style={S.value}>{metrics ? formatAgo(metrics.last_updated, t) : t('admin.loading')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
              <span className="metric-label" style={S.label}>{t('admin.status')}</span>
              <div className="metric-value" style={{ ...S.value, color: health?.backend && health?.database ? '#00E676' : '#FFD166' }}>{health ? t('admin.live') : t('admin.pending')}</div>
              </div>
            </div>
          <div className="card-base admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
              <span className="metric-label" style={S.label}>{t('admin.active_model')}</span>
              <div className="metric-value" style={S.value}>{metrics?.model_name ?? '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
              <span className="metric-label" style={S.label}>{t('admin.provider')}</span>
              <div className="metric-value" style={{ ...S.value, color: '#C8FFD1' }}>{metrics?.provider ?? '—'}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : 'minmax(0, 2fr) 1fr', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
          <div style={{ display: 'grid', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
            <SystemStatusSection health={health} loading={loading} onRefresh={refreshAll} />
            <AIEngineSection metrics={metrics} />
            <PipelineIntelligenceSection metrics={pipelineMetrics} />
          </div>
          <div style={{ display: 'grid', gap: 'clamp(0.75rem, 2vw, 1rem)', alignContent: 'start' }}>
            <ExternalAPIsSection apis={apiHealth} onResync={handleResync} />
          </div>
        </div>
      </div>
    </div>
  );
}
