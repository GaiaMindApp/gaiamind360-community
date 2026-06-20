import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useDevice } from '../hooks/useDevice'
import { TestRunnerTab } from './monitor/TestRunnerTab'
import { NotificationsTab } from './monitor/NotificationsTab'
import '../styles/components.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

interface ServiceStatus { status: 'healthy' | 'error'; latency_ms: number; data?: any; error?: string }
interface HealthData {
  timestamp: string; services: Record<string, ServiceStatus>
  summary: { total: number; healthy: number; errors: number; overall: string }
}

const STATUS_ICONS: Record<string, string> = { healthy: '🟢', error: '🔴', degraded: '🟡', critical: '🔴' }

// Paleta consistente com o tema GaiaMind
const C = {
  bg:          'rgba(0,48,73,0.4)',
  bgDeep:      'rgba(0,30,50,0.7)',
  bgCard:      'rgba(0,48,73,0.6)',
  border:      'rgba(0,230,118,0.2)',
  borderErr:   'rgba(248,113,113,0.4)',
  borderWarn:  'rgba(255,209,102,0.35)',
  green:       '#00E676',
  greenDim:    'rgba(0,230,118,0.7)',
  greenFaint:  'rgba(0,230,118,0.12)',
  text:        'rgba(224,247,250,0.9)',
  textMid:     'rgba(224,247,250,0.6)',
  textDim:     'rgba(224,247,250,0.4)',
  red:         '#f87171',
  redBg:       'rgba(127,29,29,0.5)',
  yellow:      '#FFD166',
  yellowBg:    'rgba(120,53,15,0.5)',
  latGood:     'rgba(0,78,59,0.7)',
  latMid:      'rgba(120,53,15,0.7)',
  latBad:      'rgba(127,29,29,0.7)',
}

interface ServiceMeta { icon: string; labelKey: string; whatKey: string; whyKey: string; details: (d: any, t: (k: string, o?: any) => string) => string[] }

const SERVICE_META: Record<string, ServiceMeta> = {
  database: {
    icon: '🗄️', labelKey: 'svc_db', whatKey: 'svc_db_what', whyKey: 'svc_db_why',
    details: (d, t) => [d?.connected ? `✅ ${t('monitor.svc_db_connected')}` : `❌ ${t('monitor.svc_db_disconnected')}`],
  },
  ai_provider: {
    icon: '🧠', labelKey: 'svc_ai', whatKey: 'svc_ai_what', whyKey: 'svc_ai_why',
    details: (d, t) => {
      if (!d) return [t('monitor.svc_no_data')]
      const names: Record<string, string> = { openai: 'OpenAI (GPT-4)', gemini: 'Google Gemini', groq: 'Groq (Llama)', openrouter: 'OpenRouter' }
      const lines = [`🎯 ${t('monitor.svc_ai_active')}: ${d.active?.toUpperCase() || 'none'}`]
      if (d.available?.length) lines.push(`🔌 ${t('monitor.svc_ai_configured')} (${d.available.length}): ${d.available.map((p: string) => names[p] || p).join(', ')}`)
      lines.push(`🔄 ${t('monitor.svc_ai_fallback')}`)
      return lines
    },
  },
  worldbank_api: {
    icon: '🌍', labelKey: 'svc_wb', whatKey: 'svc_wb_what', whyKey: 'svc_wb_why',
    details: (d, t) => d ? [
      d.reachable ? `✅ ${t('monitor.svc_wb_reachable')} (HTTP ${d.status_code})` : `❌ ${t('monitor.svc_wb_unreachable')}`,
      `📊 ${t('monitor.svc_wb_data')}`,
    ] : [t('monitor.svc_no_data')],
  },
  chromadb_rag: {
    icon: '📚', labelKey: 'svc_rag', whatKey: 'svc_rag_what', whyKey: 'svc_rag_why',
    details: (d, t) => d ? [
      d.exists ? `✅ ${t('monitor.svc_rag_active')} — ${d.size_mb || 0} MB` : `❌ ${t('monitor.svc_rag_missing')}`,
      `🔍 ${t('monitor.svc_rag_flow')}`,
    ] : [t('monitor.svc_no_data')],
  },
  ml_models: {
    icon: '📈', labelKey: 'svc_ml', whatKey: 'svc_ml_what', whyKey: 'svc_ml_why',
    details: (d, t) => {
      if (!d) return [t('monitor.svc_no_data')]
      const lines = [`📦 ${d.models_found || 0} ${t('monitor.svc_ml_models')}`]
      const desc: Record<string, string> = {
        lstm_climate_v1:   `🌡️ LSTM Climate — ${t('monitor.svc_ml_lstm')}`,
        xgboost_energy_v1: `⚡ XGBoost Energy — ${t('monitor.svc_ml_xgb')}`,
        ppo_policy_v1:     `🏛️ PPO Policy — ${t('monitor.svc_ml_ppo')}`,
      }
      if (d.models) Object.keys(d.models).forEach((m: string) => lines.push(desc[m] || `🔧 ${m}`))
      else Object.values(desc).forEach(v => lines.push(v))
      return lines
    },
  },
  offline_data: {
    icon: '💾', labelKey: 'svc_offline', whatKey: 'svc_offline_what', whyKey: 'svc_offline_why',
    details: (d, t) => d ? [
      d.exists ? `✅ ${t('monitor.svc_offline_present')} — ${d.size_mb || 0} MB` : `❌ ${t('monitor.svc_offline_missing')}`,
      `🌐 ${t('monitor.svc_offline_scope')}`,
    ] : [t('monitor.svc_no_data')],
  },
  multi_agent: {
    icon: '🤖', labelKey: 'svc_agent', whatKey: 'svc_agent_what', whyKey: 'svc_agent_why',
    details: (d, t) => {
      const lines = [
        `🔹 ${t('monitor.svc_agent_context')}`,
        `🔹 ${t('monitor.svc_agent_data')}`,
        `🔹 ${t('monitor.svc_agent_analysis')}`,
        `🔹 ${t('monitor.svc_agent_forecast')}`,
        `🔹 ${t('monitor.svc_agent_policy')}`,
        `🔹 ${t('monitor.svc_agent_explain')}`,
      ]
      if (d) { lines.push(''); lines.push(`⚡ Cache: ${d.cache?.active || 0} ${t('monitor.svc_agent_entries')} · Trigger: ${d.test_trigger ? '✅' : '❌'}`) }
      return lines
    },
  },
  moderation: {
    icon: '🛡️', labelKey: 'svc_mod', whatKey: 'svc_mod_what', whyKey: 'svc_mod_why',
    details: (d, t) => d ? [
      `🧪 ${t('monitor.svc_mod_test')}: score ${d.score} ${d.score === 0 ? `(✅ ${t('monitor.svc_mod_safe')})` : `(⚠️ ${t('monitor.svc_mod_unexpected')})`}`,
      `🚫 ${t('monitor.svc_mod_block')}`,
    ] : [t('monitor.svc_no_data')],
  },
  cache_service: {
    icon: '⚡', labelKey: 'svc_cache', whatKey: 'svc_cache_what', whyKey: 'svc_cache_why',
    details: (d, t) => d ? [
      `📦 ${d.total_entries || 0} ${t('monitor.svc_cache_entries')}`,
      `⏱️ TTL: ${t('monitor.svc_cache_ttl')}`,
    ] : [t('monitor.svc_no_data')],
  },
}

// Static EN labels/descriptions for service cards — replaced by i18n
// Derives true health from service data — backend returns 'healthy' even when resource is missing
function deriveStatus(name: string, svc: ServiceStatus): 'healthy' | 'warning' | 'error' {
  if (svc.status !== 'healthy') return 'error'
  const d = svc.data
  if (!d) return 'healthy'
  switch (name) {
    case 'database':      return d.connected ? 'healthy' : 'error'
    case 'ai_provider':   return d.available?.length > 0 ? 'healthy' : 'error'
    case 'worldbank_api': return d.reachable ? 'healthy' : 'warning'
    case 'chromadb_rag':  return d.exists ? 'healthy' : 'warning'
    case 'ml_models':     return d.models_found > 0 ? 'healthy' : 'warning'
    case 'offline_data':  return d.exists ? 'healthy' : 'warning'
    case 'multi_agent':   return d.operational ? 'healthy' : 'error'
    case 'moderation':    return d.operational ? 'healthy' : 'error'
    case 'cache_service': return 'healthy'
    default:              return 'healthy'
  }
}

function ServiceCard({ name, svc }: { name: string; svc: ServiceStatus }) {
  const { t } = useTranslation()
  const [exp, setExp] = useState(false)
  const meta = SERVICE_META[name]
  if (!meta) return null

  const label = t(`monitor.${meta.labelKey}`)
  const what  = t(`monitor.${meta.whatKey}`)
  const why   = t(`monitor.${meta.whyKey}`)

  const details = svc.data && svc.status === 'healthy' ? meta.details(svc.data, t) : []
  const derived = deriveStatus(name, svc)
  const isOk      = derived === 'healthy'
  const isWarning = derived === 'warning'
  const isError   = derived === 'error'

  const cardBg     = isOk ? C.bg      : isWarning ? C.yellowBg : C.bgDeep
  const cardBorder = isOk ? C.border  : isWarning ? C.borderWarn : C.borderErr
  const statusIcon = isOk ? '🟢'      : isWarning ? '🟡' : '🔴'

  return (
    <div className={`monitor-card status-${derived}`} onClick={() => setExp(!exp)} style={{
      padding: 'clamp(0.75rem, 2vw, 1rem)',
      borderRadius: '0.75rem',
      cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
      background: cardBg,
      border: `1px solid ${cardBorder}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: 8 }}>
        <span className={`monitor-card-title status-${derived}`} style={{ fontWeight: 600, fontSize: 'clamp(0.8rem, 2vw, 0.875rem)', color: isError ? C.red : isWarning ? C.yellow : C.text, minWidth: 0 }}>
          {meta.icon} {label}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span className={`monitor-latency level-${svc.latency_ms < 100 ? 'good' : svc.latency_ms < 1000 ? 'mid' : 'bad'}`} style={{
            fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)', padding: '2px 8px', borderRadius: 999, fontWeight: 600,
            background: svc.latency_ms < 100 ? C.latGood : svc.latency_ms < 1000 ? C.latMid : C.latBad,
            color: svc.latency_ms < 100 ? C.green : svc.latency_ms < 1000 ? C.yellow : C.red,
            border: `1px solid ${svc.latency_ms < 100 ? 'rgba(0,230,118,0.3)' : svc.latency_ms < 1000 ? 'rgba(255,209,102,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>{svc.latency_ms}ms</span>
          <span style={{ fontSize: 14 }}>{statusIcon}</span>
        </div>
      </div>

      {/* What */}
      <div className="monitor-card-what" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: C.textMid, lineHeight: 1.5, marginBottom: '0.375rem' }}>
        {what}
      </div>

      {/* Why */}
      <div className="monitor-card-why" style={{
        fontSize: 'clamp(0.65rem, 1.6vw, 0.7rem)', lineHeight: 1.4, marginBottom: '0.5rem',
        color: C.yellow, fontStyle: 'italic',
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
        background: C.yellowBg, border: `1px solid ${C.borderWarn}`,
      }}>💡 {why}</div>

      {/* Error */}
      {(isError || isWarning) && svc.error && (
        <div className="monitor-card-error" style={{
          fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: C.red,
          padding: '0.375rem 0.625rem', background: C.redBg,
          borderRadius: '0.375rem', wordBreak: 'break-word', marginBottom: '0.375rem',
          border: `1px solid ${C.borderErr}`,
        }}>❌ {svc.error}</div>
      )}

      {/* Details expandable */}
      {details.length > 0 && (
        <div className={`monitor-card-details status-${derived}`} style={{
          fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: C.text, lineHeight: 1.7,
          padding: exp ? '0.5rem 0.75rem' : '0.25rem 0.75rem',
          background: isOk ? C.greenFaint : isWarning ? 'rgba(255,209,102,0.08)' : C.redBg,
          borderRadius: '0.5rem',
          border: `1px solid ${cardBorder}`,
          maxHeight: exp ? 400 : 28, overflow: 'hidden', transition: 'max-height 0.3s ease',
        }}>
          {!exp && <span className="monitor-card-details-clicker" style={{ color: isOk ? C.greenDim : isWarning ? C.yellow : C.red, fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)' }}>{t('monitor.click_expand')} ({details.length})</span>}
          {exp && (
            <div>
              <span style={{ color: isOk ? C.greenDim : isWarning ? C.yellow : C.red, fontSize: '0.65rem', display: 'block', marginBottom: 4 }}>{t('monitor.realtime_state')}</span>
              {details.map((l, i) => (
                <div className="monitor-card-details-row" key={i} style={{ paddingLeft: l.startsWith('🔹') ? 4 : 0, color: l.startsWith('✅') ? C.green : l.startsWith('❌') ? C.red : C.text }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ServicesTab({ health, error, autoRefresh, setAutoRefresh, onRefresh, lastUpdate }: {
  health: HealthData | null; error: string | null; autoRefresh: boolean
  setAutoRefresh: (v: boolean) => void; onRefresh: () => void; lastUpdate: Date | null
}) {
  const { t } = useTranslation()
  const { isMobile } = useDevice()

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem', gap: 8, flexWrap: 'wrap' }}>
        <p className="monitor-header-desc" style={{ margin: 0, fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: C.textMid, lineHeight: 1.5, flex: 1, minWidth: 0 }}>
          {t('monitor.services_desc')}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <label className="monitor-refresh-label" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)', color: C.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
            {t('monitor.auto_refresh')}
          </label>
          <button className="monitor-refresh-btn" onClick={onRefresh} style={{
            padding: '0 0.75rem', borderRadius: '0.5rem', minHeight: 36, minWidth: 36,
            border: `1px solid ${C.border}`, background: C.greenFaint,
            color: C.green, cursor: 'pointer', fontSize: '0.875rem',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>🔄</button>
        </div>
      </div>

      {error && (
        <div className="monitor-main-error" style={{ padding: '0.625rem 0.875rem', background: C.redBg, border: `1px solid ${C.borderErr}`, borderRadius: '0.5rem', marginBottom: '0.875rem', color: C.red, fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)' }}>
          ⚠️ {error}
        </div>
      )}

      {health && (
        <>
          {/* Overall status banner — derived from real data, not just backend status */}
          {(() => {
            const entries = Object.entries(health.services)
            const derived = entries.map(([n, s]) => deriveStatus(n, s))
            const errCount  = derived.filter(d => d === 'error').length
            const warnCount = derived.filter(d => d === 'warning').length
            const okCount   = derived.filter(d => d === 'healthy').length
            const overall   = errCount > 0 ? 'error' : warnCount > 0 ? 'warning' : 'healthy'
            const bannerBg     = overall === 'healthy' ? 'rgba(0,78,59,0.5)' : overall === 'warning' ? C.yellowBg : C.redBg
            const bannerBorder = overall === 'healthy' ? 'rgba(0,230,118,0.35)' : overall === 'warning' ? C.borderWarn : C.borderErr
            const bannerColor  = overall === 'healthy' ? C.green : overall === 'warning' ? C.yellow : C.red
            const bannerIcon   = overall === 'healthy' ? '🟢' : overall === 'warning' ? '🟡' : '🔴'
            const bannerLabel  = overall === 'healthy' ? t('monitor.all_operational') : overall === 'warning' ? t('monitor.partially_operational') : t('monitor.critical_system')
            const bannerSub    = overall === 'healthy' ? t('monitor.all_services_ok') : `${errCount + warnCount} ${t('monitor.services_with_issues')}`
            return (
              <div className={`monitor-overall-banner status-${overall}`} style={{
                display: 'flex', gap: isMobile ? 8 : 16, marginBottom: '1rem',
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                background: bannerBg, border: `1px solid ${bannerBorder}`,
                borderRadius: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                  <div className="monitor-overall-title" style={{ fontSize: 'clamp(0.875rem, 3vw, 1.25rem)', fontWeight: 700, color: bannerColor }}>
                    {bannerIcon} {bannerLabel}
                  </div>
                  <div className="monitor-overall-sub" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)', color: C.textMid, marginTop: 4 }}>
                    {bannerSub}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: isMobile ? 12 : 20 }}>
                  {[
                    { val: okCount,   color: C.green,   label: t('monitor.active') },
                    { val: errCount + warnCount, color: errCount > 0 ? C.red : C.yellow, label: t('monitor.errors') },
                    { val: entries.length, color: C.textMid, label: t('monitor.total') },
                  ].map(({ val, color, label }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div className="monitor-stat-val" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color }}>{val}</div>
                      <div className="monitor-stat-label" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.65rem)', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Service cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(240px, 40vw, 300px), 1fr))', gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
            {Object.entries(health.services).map(([n, s]) => <ServiceCard key={n} name={n} svc={s} />)}
          </div>

          {lastUpdate && (
            <div className="monitor-last-update" style={{ marginTop: '0.75rem', fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)', color: C.textDim, textAlign: 'right' }}>
              {t('monitor.updated_at')}: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabBtn({ active, label, badge, onClick }: { active: boolean; label: string; badge?: number; onClick: () => void }) {
  return (
    <button className={`monitor-tab-btn ${active ? 'active' : ''}`} onClick={onClick} style={{
      padding: 'clamp(0.5rem, 1.5vw, 0.625rem) clamp(0.75rem, 2vw, 1.125rem)',
      background: active ? C.greenFaint : 'transparent',
      border: 'none',
      borderBottom: active ? `2px solid ${C.green}` : '2px solid transparent',
      color: active ? C.green : C.textDim,
      cursor: 'pointer',
      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
      fontWeight: active ? 600 : 400,
      display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{ padding: '1px 7px', borderRadius: 999, background: C.red, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>{badge}</span>
      )}
    </button>
  )
}

export function ServiceMonitor() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const { isMobile } = useDevice()
  const [tab, setTab] = useState<'services' | 'tests' | 'notifications'>('services')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchHealth = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) { setError(t('monitor.not_authenticated')); setLoading(false); return }
      const res = await fetch(`${API_BASE}/api/system/services-health`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setHealth(await res.json()); setError(null); setLastUpdate(new Date())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_BASE}/api/test-runner/state`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setUnreadCount(d.unread_notifications || 0) }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchHealth(); fetchUnread()
    if (!autoRefresh) return
    const i = setInterval(() => { fetchHealth(); fetchUnread() }, 15000)
    return () => clearInterval(i)
  }, [fetchHealth, fetchUnread, autoRefresh])

  if (loading && !health) return (
    <div className="monitor-container component-container">
      <div className="component-wrapper section">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
          <p style={{ color: 'rgba(224,247,250,0.7)', fontSize: '0.875rem' }}>⏳ {t('monitor.loading')}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="monitor-container component-container">
      <div className="component-wrapper section">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)' }}
        >
          <h1 className="section-title monitor-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            🖥️ {t('monitor.title')}
          </h1>
          <p className="text-responsive-md monitor-subtitle" style={{ color: 'rgba(224,247,250,0.7)', maxWidth: '42rem', margin: '0 auto' }}>
            {t('monitor.subtitle')}
          </p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-responsive">
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,230,118,0.15)', marginBottom: 'clamp(0.75rem, 2vw, 1rem)', overflowX: 'auto' }}>
            <TabBtn active={tab === 'services'}      label={t('monitor.tab_services')}      onClick={() => setTab('services')} />
            <TabBtn active={tab === 'tests'}         label={t('monitor.tab_tests')}         onClick={() => setTab('tests')} />
            <TabBtn active={tab === 'notifications'} label={t('monitor.tab_notifications')} badge={unreadCount} onClick={() => { setTab('notifications'); setUnreadCount(0) }} />
          </div>

          <div className="card-base">
            {tab === 'services'      && <ServicesTab health={health} error={error} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} onRefresh={fetchHealth} lastUpdate={lastUpdate} />}
            {tab === 'tests'         && <TestRunnerTab />}
            {tab === 'notifications' && <NotificationsTab />}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
