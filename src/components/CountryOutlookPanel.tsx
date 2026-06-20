import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import '../styles/outlook.css'
import { authFetch } from '../services/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Mapa de adaptação de cores dark → light ──────────────────────────────────
// As cores do backend são sempre neon (dark). Este mapa converte-as para
// equivalentes com contraste adequado em fundo claro.
const DARK_TO_LIGHT_COLOR: Record<string, string> = {
  // Verdes neon → verde escuro
  '#00E676': '#057A55', '#00e676': '#057A55',
  '#69F0AE': '#0E9F6E', '#06D6A0': '#057A55',
  '#4ade80': '#057A55', '#22c55e': '#057A55',
  '#16A34A': '#057A55', '#34A853': '#057A55',
  // Vermelhos → vermelho acessível
  '#f87171': '#DC2626', '#F87171': '#DC2626',
  '#FF2222': '#DC2626', '#FF4444': '#DC2626',
  '#ef4444': '#DC2626', '#991B1B': '#991B1B',
  // Laranjas / At Risk
  '#FF8C42': '#EA580C', '#FF9800': '#EA580C',
  '#ff9800': '#EA580C',
  // Amarelos → âmbar escuro
  '#FFD54F': '#D97706', '#ffd54f': '#D97706',
  '#FFD166': '#D97706', '#F59E0B': '#D97706',
  '#f59e0b': '#D97706', '#B45309': '#92400E',
  '#D97706': '#D97706', '#eab308': '#D97706',
  // Azuis claros → azul escuro
  '#4FC3F7': '#1D4ED8', '#4fc3f7': '#1D4ED8',
  '#4A9EFF': '#1D4ED8', '#0B57D0': '#1D4ED8',
  '#0284C7': '#1D4ED8', '#1C64F2': '#1D4ED8',
  // Brancos / cinzas claros → texto escuro
  '#E0F7FA': '#0F172A', '#e0f7fa': '#0F172A',
  '#FFFFFF': '#0F172A', '#ffffff': '#0F172A',
}

/**
 * Adapta uma cor do backend ao tema atual.
 * Se estiver em light mode e a cor for neon/dark, converte para equivalente acessível.
 */
function adaptColor(color: string): string {
  if (!color) return color
  const isLight = document.documentElement.classList.contains('light')
  if (!isLight) return color
  return DARK_TO_LIGHT_COLOR[color] ?? color
}

/**
 * Adapta um background rgba escuro para light mode.
 * Ex: rgba(0,230,118,0.1) → rgba(5,122,85,0.08)
 */
function adaptBg(bg: string): string {
  if (!bg) return bg
  const isLight = document.documentElement.classList.contains('light')
  if (!isLight) return bg
  // rgba com verde neon
  if (bg.includes('0,230,118') || bg.includes('0, 230, 118'))
    return bg.replace(/rgba\(0,\s*230,\s*118,\s*([\d.]+)\)/, (_, a) => `rgba(5,122,85,${Math.min(parseFloat(a) * 1.5, 0.15)})`)
  // rgba com vermelho
  if (bg.includes('248,113,113') || bg.includes('248, 113, 113'))
    return bg.replace(/rgba\(248,\s*113,\s*113,\s*([\d.]+)\)/, (_, a) => `rgba(220,38,38,${a})`)
  // rgba com amarelo
  if (bg.includes('255,213,79') || bg.includes('255, 213, 79') || bg.includes('245,158,11') || bg.includes('245, 158, 11'))
    return bg.replace(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/, (_, a) => `rgba(217,119,6,${a})`)
  return bg
}

const TOKEN_COLORS = {
  text: 'var(--text-primary)',
  critical: 'var(--color-critical)',
  warning: 'var(--color-warning)',
  stable: 'var(--color-stable)',
  info: 'var(--color-info)',
  watchlist: 'var(--color-watchlist)',
  improving: 'var(--color-improving)',
}

const VERDICT_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  CRITICAL:          { icon: '🔴', color: TOKEN_COLORS.critical, bg: 'var(--bg-critical)' },
  AT_RISK:           { icon: '🟠', color: TOKEN_COLORS.watchlist, bg: 'var(--bg-warning)' },
  LIKELY_DECLINE:    { icon: '🟡', color: TOKEN_COLORS.warning, bg: 'var(--bg-warning)' },
  STABLE:            { icon: '🔵', color: TOKEN_COLORS.info, bg: 'var(--bg-info)' },
  IMPROVING_AT_RISK: { icon: '🟤', color: TOKEN_COLORS.warning, bg: 'rgba(146,64,14,0.1)' },
  LIKELY_IMPROVE:    { icon: '🟢', color: TOKEN_COLORS.stable, bg: 'var(--bg-stable)' },
  STRONG_IMPROVE:    { icon: '💚', color: TOKEN_COLORS.improving, bg: 'var(--bg-improving)' },
}

const ALERT_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  CRITICAL:  { icon: '🔴', color: TOKEN_COLORS.critical, bg: 'var(--bg-critical)' },
  HIGH:      { icon: '🟥', color: TOKEN_COLORS.critical, bg: 'var(--bg-critical)' },
  WATCHLIST: { icon: '🟠', color: TOKEN_COLORS.watchlist, bg: 'var(--bg-warning)' },
  MEDIUM:    { icon: '🟡', color: TOKEN_COLORS.warning, bg: 'var(--bg-warning)' },
  LOW:       { icon: '🟢', color: TOKEN_COLORS.stable, bg: 'var(--bg-stable)' },
}

const ALERT_LEVELS = ['CRITICAL', 'HIGH', 'WATCHLIST', 'MEDIUM', 'LOW'] as const
type AlertLevel = (typeof ALERT_LEVELS)[number]

const fmt3 = (v?: number | null) => {
  const value = typeof v === 'number' && Number.isFinite(v) ? v : 0
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`
}
const fmt4 = (v?: number | null) => {
  const value = typeof v === 'number' && Number.isFinite(v) ? v : 0
  return `${value >= 0 ? '+' : ''}${value.toFixed(4)}`
}

function fadeUp(delay = 0) {
  return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.4 } }
}

export function CountryOutlookPanel({
  verdictFilter = [],
  tierFilter = [],
  onVerdictFilterChange,
  onTierFilterChange,
}: {
  verdictFilter?: string[]
  tierFilter?: number[]
  onVerdictFilterChange?: (v: string[]) => void
  onTierFilterChange?: (t: number[]) => void
}) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<any | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<keyof any>('outlook_score')
  const [sortAsc, setSortAsc] = useState(true)
  const [alertFilter, setAlertFilter] = useState<AlertLevel[]>([...ALERT_LEVELS])

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true)
      setError('')
      try {
        const lang = i18n.language?.slice(0, 2) || 'en'
        const [summaryRes, alertsRes, countriesRes] = await Promise.all([
          authFetch(`${API}/api/insights/summary?lang=${lang}`),
          authFetch(`${API}/api/insights/alerts`),
          authFetch(`${API}/api/insights/countries`),
        ])
        if (!summaryRes.ok || !alertsRes.ok || !countriesRes.ok) {
          throw new Error('Failed to load overview data.')
        }
        setSummary(await summaryRes.json())
        setAlerts(await alertsRes.json())
        setCountries(await countriesRes.json())
      } catch (e: any) {
        setError(e?.message ?? t('insights.overview.errorGeneric'))
      } finally {
        setLoading(false)
      }
    }

    loadOverview()
  }, [t])

  useEffect(() => { setSortCol('outlook_score'); setSortAsc(true); }, [verdictFilter, tierFilter])

  const selectCountry = useCallback((code: string) => {
    authFetch(`${API}/api/insights/country/${code}`)
      .then((r) => r.json())
      .then((data) => {
        setSelected({ ...data })
      })
      .catch((e) => setError(e.message))
  }, [])

  const filtered = countries.filter((c) => {
    if (search && !c.country.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false
    if (verdictFilter.length > 0 && !verdictFilter.includes(c.verdict)) return false
    if (tierFilter.length > 0 && !tierFilter.includes(c.tier)) return false
    if (alertFilter.length > 0 && !alertFilter.includes(c.alert_level as AlertLevel)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? 0
    const bv = b[sortCol] ?? 0
    if (typeof av === 'string' && typeof bv === 'string')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const handleSort = (col: keyof any) => {
    if (sortCol === col) setSortAsc((a) => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  const verdictLabel = (v: string) => t(`insights.verdict.${v}`)
  const dateLabel = new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })

  if (loading) return <div className="op-loading">{t('insights.overview.loading')}</div>
  if (error) return <div className="op-error">{t('insights.overview.error', { error })}</div>
  if (!summary || !summary.system_state) return <div className="op-error">{t('insights.overview.emptySummary')}</div>

  return (
    <div className="op-root">
      {summary && !selected && (
        <>
          <motion.div className="op-hero" {...fadeUp(0)}>
            <div className="op-hero-left">
              <div className="op-hero-title">{t('insights.overview.hero.title')}</div>
              <div className="op-hero-subtitle">
                {t('insights.overview.hero.subtitle', { total: summary.total_countries, date: dateLabel })}
              </div>
            </div>
            <div className="op-hero-right">
              <div className="op-hero-meta-label">{t('insights.overview.hero.systemState')}</div>
              <div className="op-hero-meta-state" style={{ color: adaptColor(summary.system_state.color) }}>
                {summary.system_state.icon} {summary.system_state.state}
              </div>
              <div className="op-hero-meta-type" style={{ color: adaptColor(summary.system_type.color) }}>
                {summary.system_type.type}
              </div>
              <div className="op-hero-urgency">
                <span className="op-hero-urgency-label">{t('insights.overview.hero.urgencyLabel')}</span>
                <span className="op-hero-urgency-score" style={{ color: adaptColor(summary.urgency.color) }}>{summary.urgency.score}/100</span>
                <span className="op-hero-urgency-badge" style={{ color: adaptColor(summary.urgency.color) }}>{summary.urgency.label}</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="op-hero-stats" {...fadeUp(0.05)}>
            {[
              { label: t('insights.overview.stats.atCritical'), value: summary.n_critical, color: TOKEN_COLORS.critical },
              { label: t('insights.overview.stats.inDecline'), value: summary.n_declining, color: TOKEN_COLORS.warning },
              { label: t('insights.overview.stats.improving'), value: summary.n_improving, color: TOKEN_COLORS.stable },
              { label: t('insights.overview.stats.globalScore'), value: fmt3(summary.avg_score), color: TOKEN_COLORS.info },
              { label: t('insights.overview.stats.ppoImpact'), value: `+${(summary.ppo_avg_impact ?? summary.strategic?.ppo_avg_impact ?? 0).toFixed(3)}`, color: TOKEN_COLORS.stable },
            ].map((item, index) => (
              <div key={item.label} className="op-hero-stat" {...fadeUp(index * 0.02)}>
                <div className="op-hero-stat-num" style={{ color: item.color }}>{item.value}</div>
                <div className="op-hero-stat-label">{item.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="op-card-grid" {...fadeUp(0.1)}>
            {[
              { title: t('insights.overview.cards.decisionMode.title'), value: summary.decision_mode.mode, color: adaptColor(summary.decision_mode.color), subtitle: t('insights.overview.cards.decisionMode.subtitle') },
              { title: t('insights.overview.cards.policyEffectiveness.title'), value: summary.policy_effectiveness.level, color: adaptColor(summary.policy_effectiveness.color), subtitle: summary.policy_effectiveness.desc },
              { title: t('insights.overview.cards.actionability.title'), value: summary.actionability.level, color: adaptColor(summary.actionability.color), subtitle: summary.actionability.desc },
              { title: t('insights.overview.cards.timeToImpact.title'), value: summary.time_to_impact.label, color: TOKEN_COLORS.info, subtitle: summary.time_to_impact.desc },
            ].map((item, index) => (
              <div key={item.title} className="op-card op-mini-card" {...fadeUp(index * 0.03)}>
                <div className="op-card-title">{item.title}</div>
                <div className="op-card-value" style={{ color: item.color }}>{item.value}</div>
                <div className="op-card-subtitle">{item.subtitle}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="op-card op-executive" {...fadeUp(0.12)}>
            <div className="op-card-title">{t('insights.overview.cards.executiveInsight.title')}</div>
            <div className="op-card-text">{summary.executive_insight}</div>
          </motion.div>

          <div className="op-section-header">
            <span className="op-section-tag">{t('insights.overview.systemDrivers.title')}</span>
            <span className="op-section-sub">{t('insights.overview.systemDrivers.subtitle')}</span>
          </div>
          <motion.div className="op-driver-grid" {...fadeUp(0.14)}>
            {summary.drivers.map((driver: any, index: number) => (
              <div key={driver.rank} className="op-driver-card" {...fadeUp(index * 0.02)}>
                <div className="op-driver-rank">{driver.rank}</div>
                <div className="op-driver-value" style={{ color: driver.value < 0 ? TOKEN_COLORS.critical : TOKEN_COLORS.stable }}>
                  {fmt3(driver.value)}
                </div>
                <div className="op-driver-label">{driver.label}</div>
                <div className="op-driver-tag" style={{ background: adaptBg(`${driver.tag_color}22`), color: adaptColor(driver.tag_color) }}>{driver.tag}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="op-card op-system-diagnosis" {...fadeUp(0.16)}>
            <div className="op-card-text">{t('insights.overview.systemDiagnosisPrefix')} {summary.system_diagnosis}</div>
          </motion.div>

          <div className="op-section-header">
            <span className="op-section-tag">{t('insights.overview.globalVerdict.title')}</span>
          </div>
          <motion.div className="op-verdict-grid" {...fadeUp(0.18)}>
            {Object.entries(VERDICT_STYLE).map(([v, cfg]) => {
              const count = summary.verdict_distribution[v] ?? 0
              const pct = summary.total_countries ? Math.round((count / summary.total_countries) * 100) : 0
              return (
                <div key={v} className="op-verdict-card" style={{ borderColor: cfg.color, background: cfg.bg }}>
                  <div className="op-verdict-icon">{cfg.icon}</div>
                  <div className="op-verdict-count" style={{ color: cfg.color }}>{count}</div>
                  <div className="op-verdict-label">{verdictLabel(v)}</div>
                  <div className="op-verdict-pct" style={{ color: cfg.color }}>{pct}%</div>
                </div>
              )
            })}
          </motion.div>

          <motion.div className="op-card op-priority-panel" {...fadeUp(0.2)}>
            <div className="op-card-title">{t('insights.overview.priority.title')}</div>
            <div className="op-card-subtitle">{t('insights.overview.priority.subtitle')}</div>
            <div className="op-priority-list">
              {summary.priority_list.map((item: any, idx: number) => {
                const cfg = VERDICT_STYLE[item.verdict] || VERDICT_STYLE.STABLE
                return (
                  <div key={item.code} className="op-priority-row">
                    <div className="op-priority-rank">{idx + 1}</div>
                    <div className="op-priority-content">
                      <div className="op-priority-country">{item.country}</div>
                      <div className="op-priority-meta">
                        <span className="op-priority-badge" style={{ color: cfg.color, background: `${cfg.color}22` }}>{cfg.icon} {verdictLabel(item.verdict)}</span>
                        <span>{t('insights.overview.priority.scorePrefix')} {item.score > 0 ? '+' : ''}{item.score.toFixed(3)} · {t('insights.overview.priority.pSevere')} {Math.round(item.severe_prob * 100)}%</span>
                      </div>
                      <div className="op-priority-driver">{t('insights.overview.priority.driverPrefix')} {item.driver} · PPO: {item.policy}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div className="op-card op-counterfactual" {...fadeUp(0.22)}>
            <div className="op-card-title">{t('insights.overview.counterfactual.title')}</div>
            <div className="op-card-subtitle">{t('insights.overview.counterfactual.subtitle')}</div>
            <div className="op-hero-stats op-counterfactual-stats">
              {[
                { label: t('insights.overview.counterfactual.metrics.improvingActual'), value: summary.counterfactual.improving_with_risk ?? 0, color: TOKEN_COLORS.stable },
                { label: t('insights.overview.counterfactual.metrics.improvingNoRisk'), value: summary.counterfactual.improving_without_risk ?? 0, color: TOKEN_COLORS.stable },
                { label: t('insights.overview.counterfactual.metrics.criticalActual'), value: summary.counterfactual.critical_with_risk ?? 0, color: TOKEN_COLORS.critical },
                { label: t('insights.overview.counterfactual.metrics.criticalNoRisk'), value: summary.counterfactual.critical_without_risk ?? 0, color: TOKEN_COLORS.critical },
              ].map((metric, index) => (
                <div key={metric.label} className="op-hero-stat" {...fadeUp(index * 0.02)}>
                  <div className="op-hero-stat-num" style={{ color: metric.color }}>{metric.value}</div>
                  <div className="op-hero-stat-label">{metric.label}</div>
                </div>
              ))}
            </div>
            <div className="op-card-text" style={{ marginTop: '1rem' }}>
              {summary.counterfactual.countries_downgraded_by_risk !== undefined
                ? t('insights.overview.counterfactual.text', {
                    downgraded: summary.counterfactual.countries_downgraded_by_risk,
                    improving: summary.counterfactual.improving_with_risk,
                  })
                : t('insights.overview.counterfactual.unavailable')}
            </div>
            <div className="op-counterfactual-badges">
              <span>{t('insights.overview.counterfactual.badgeImproving', { improving: summary.counterfactual.improving_with_risk ?? 0 })}</span>
              <span>{t('insights.overview.counterfactual.badgeCritical', { downgraded: summary.counterfactual.countries_downgraded_by_risk ?? 0 })}</span>
            </div>
          </motion.div>

          <motion.div className="op-card op-alerts-panel" {...fadeUp(0.19)}>
            <div className="op-card-title">{t('insights.overview.alerts.title')}</div>
            <div className="op-card-subtitle">{t('insights.overview.alerts.subtitle', { count: alerts.length })}</div>
            <div className="op-alerts-grid">
              {alerts.map((a: any) => (
                <div key={a.code} className="op-alert-card" style={{ borderLeftColor: adaptColor(a.fusion_color) }}>
                  <div className="op-alert-header">
                    <span className="op-alert-code" style={{ color: adaptColor(a.fusion_color) }}>{a.code}</span>
                    <span className="op-alert-badge" style={{ background: adaptBg(`${a.fusion_color}22`), color: adaptColor(a.fusion_color) }}>
                      {a.fusion_alert?.replace(/_/g, ' ')}
                    </span>
                    <span className="op-alert-score">fusion: {a.fusion_score.toFixed(2)}</span>
                  </div>
                  <div className="op-alert-meta">
                    <span>{t('insights.overview.alerts.regime')} <strong style={{ color: a.regime === 'DECLINING' || a.regime === 'CRISIS' ? TOKEN_COLORS.critical : TOKEN_COLORS.stable }}>{a.regime}</strong> ({a.regime_slope > 0 ? '+' : ''}{a.regime_slope.toFixed(1)}/yr)</span>
                    <span>{t('insights.overview.alerts.pSevere')} <strong style={{ color: a.severe_prob > 0.4 ? TOKEN_COLORS.critical : TOKEN_COLORS.warning }}>{Math.round(a.severe_prob * 100)}%</strong></span>
                    <span>{t('insights.overview.alerts.forecast')} <strong style={{ color: a.forecast_p50 < 0 ? TOKEN_COLORS.critical : TOKEN_COLORS.stable }}>{a.forecast_p50 > 0 ? '+' : ''}{a.forecast_p50.toFixed(1)} pts</strong></span>
                  </div>
                  <div className="op-alert-trigger">{a.ews_trigger}</div>
                  <div className="op-alert-action" style={{ color: adaptColor(a.fusion_color) }}>{t('insights.overview.alerts.actionPrefix')} {a.risk_action}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="op-card op-strategic" {...fadeUp(0.26)}>
            <div className="op-card-title">{t('insights.overview.strategic.title')}</div>
            <div className="op-card-subtitle">{t('insights.overview.strategic.subtitle')}</div>
            <div className="op-card-text">{summary.strategic.message}</div>
            <div className="op-strategic-points">
              <div>{t('insights.overview.strategic.primaryLever', { lever: summary.strategic.primary_lever })}</div>
              <div>{t('insights.overview.strategic.improvingAtRisk', { count: summary.strategic.n_improving_at_risk })}</div>
              <div>{t('insights.overview.strategic.ppoImpact', { impact: (summary.strategic.ppo_avg_impact ?? 0).toFixed(3) })}</div>
            </div>
            <div className="op-time-horizon-grid">
              {[
                { title: t('insights.overview.timeHorizon.short.title'), value: t('insights.overview.timeHorizon.short.value'), desc: t('insights.overview.timeHorizon.short.desc') },
                { title: t('insights.overview.timeHorizon.mid.title'), value: t('insights.overview.timeHorizon.mid.value'), desc: t('insights.overview.timeHorizon.mid.desc') },
                { title: t('insights.overview.timeHorizon.long.title'), value: t('insights.overview.timeHorizon.long.value', { impact: (summary.strategic.ppo_avg_impact ?? 0).toFixed(3) }), desc: t('insights.overview.timeHorizon.long.desc') },
              ].map((item, index) => (
                <div key={item.title} className="op-time-horizon-card">
                  <div className="op-time-horizon-label">{item.title}</div>
                  <div className="op-time-horizon-value">{item.value}</div>
                  <div className="op-time-horizon-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {!selected && <motion.div className="op-table-section" {...fadeUp(0.28)}>
        <div className="op-table-topbar">
          <div className="op-table-header">{t('insights.overview.table.title')} <span className="op-table-count">{sorted.length} {t('insights.overview.table.countries')}</span></div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('insights.overview.table.searchPlaceholder')}
            className="op-table-search"
          />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(224,247,250,0.5)', whiteSpace: 'nowrap' }}>Risk Level:</span>
            {ALERT_LEVELS.map((al) => {
              const cfg = ALERT_STYLE[al]
              const active = alertFilter.includes(al)
              // show count per level
              const count = countries.filter(c => c.alert_level === al).length
              if (count === 0) return null
              return (
                <button
                  key={al}
                  type="button"
                  onClick={() => setAlertFilter(cur =>
                    cur.includes(al) ? cur.filter(x => x !== al) : [...cur, al]
                  )}
                  style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer',
                    border: `1px solid ${cfg.color}`,
                    background: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : 'rgba(224,247,250,0.4)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {cfg.icon} {al} ({count})
                </button>
              )
            })}
          </div>
        </div>
        <div className="op-table-scroll">
          <table className="op-table">
            <thead>
              <tr>
                {([
                  { col: 'country',         label: t('insights.overview.table.headers.country') },
                  { col: 'code',            label: t('insights.overview.table.headers.code') },
                  { col: 'tier',            label: t('insights.overview.table.headers.tier') },
                  { col: 'score_current',   label: 'Gaia Score' },
                  { col: 'alert_level',     label: 'Risk Level' },
                  { col: 'verdict',         label: t('insights.overview.table.headers.verdict') },
                  { col: 'outlook_score',   label: t('insights.overview.table.headers.score') },
                  { col: 'score_no_risk',   label: t('insights.overview.table.headers.noRisk') },
                  { col: 'contrib_forecast',label: t('insights.overview.table.headers.forecast') },
                  { col: 'contrib_risk',    label: t('insights.overview.table.headers.risk') },
                  { col: 'contrib_drivers', label: t('insights.overview.table.headers.drivers') },
                  { col: 'severe_prob',     label: t('insights.overview.table.headers.pSevere') },
                ] as { col: keyof any; label: string }[]).map(({ col, label }) => (
                  <th key={col} onClick={() => handleSort(col)} className="op-table-th-sort">
                    {label}
                    <span className="op-sort-icon">
                      {sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ' ↕'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const cfg = VERDICT_STYLE[c.verdict] || VERDICT_STYLE.STABLE
                return (
                  <tr key={c.code} onClick={() => selectCountry(c.code)} className="op-table-row">
                    <td className="op-td-country">{c.country}</td>
                    <td>{c.code}</td>
                    <td>T{c.tier}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(c.score_current ?? 0).toFixed(1)}</td>
                    <td>{
                      (() => {
                        const al = c.alert_level || 'LOW'
                        const acfg = ALERT_STYLE[al] || ALERT_STYLE.LOW
                        return <span style={{ color: acfg.color, background: acfg.bg, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{acfg.icon} {al}</span>
                      })()
                    }</td>
                    <td><span className="op-table-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.icon} {verdictLabel(c.verdict)}</span></td>
                    <td style={{ color: (c.outlook_score ?? 0) < 0 ? 'var(--color-critical)' : 'var(--color-stable)', fontWeight: 700 }}>{fmt3(c.outlook_score)}</td>
                    <td>{fmt3(c.score_no_risk)}</td>
                    <td style={{ color: (c.contrib_forecast ?? 0) < 0 ? 'var(--color-critical)' : 'var(--color-stable)' }}>{fmt4(c.contrib_forecast)}</td>
                    <td style={{ color: (c.contrib_risk ?? 0) < 0 ? 'var(--color-critical)' : 'var(--color-stable)' }}>{fmt4(c.contrib_risk)}</td>
                    <td style={{ color: (c.contrib_drivers ?? 0) < 0 ? 'var(--color-critical)' : 'var(--color-stable)' }}>{fmt4(c.contrib_drivers)}</td>
                    <td style={{ color: (c.severe_prob ?? 0) > 0.5 ? 'var(--color-critical)' : (c.severe_prob ?? 0) > 0.2 ? 'var(--color-warning)' : 'var(--color-stable)' }}>{Math.round((c.severe_prob ?? 0) * 100)}%</td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={12} className="op-table-empty">{t('insights.overview.table.noResults')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="op-table-footer">
          {t('insights.overview.table.footer', { shown: sorted.length, total: countries.length })}
        </div>
      </motion.div>}
      {selected && <CountryDetail data={selected} onBack={() => setSelected(null)} />}
    </div>
  )
}

function CountryDetail({ data: d, onBack }: { data: any; onBack: () => void }) {
  const { t } = useTranslation()
  const cfg = VERDICT_STYLE[d.verdict] || VERDICT_STYLE.STABLE
  const contribTotal = Math.max(
    Math.abs(d.contributions?.risk ?? 0) + Math.abs(d.contributions?.forecast ?? 0) + Math.abs(d.contributions?.drivers ?? 0),
    0.001,
  )
  const topPositive = Array.isArray(d.top_positive) ? d.top_positive : []
  const topNegative = Array.isArray(d.top_negative) ? d.top_negative : []
  const strategyPhases = Array.isArray(d.strategy?.phases) ? d.strategy.phases : []

  return (
    <div className="op-detail">

      <button type="button" onClick={onBack} className="op-back-btn">{t('insights.overview.detail.back')}</button>

      <motion.div className="op-detail-header" style={{ borderLeftColor: cfg.color, background: cfg.bg }} {...fadeUp(0)}>
        <div className="op-detail-header-left">
          <span className="op-detail-icon">{cfg.icon}</span>
          <div>
            <div className="op-detail-country">{d.country}</div>
            <div className="op-detail-verdict" style={{ color: cfg.color }}>
              {t(`insights.verdict.${d.verdict}`)} · T{d.tier}
              {d.system_type && <span style={{ color: adaptColor(d.system_color) }}> · {d.system_type}</span>}
            </div>
          </div>
        </div>
        <div className="op-detail-score-wrap">
          <div className="op-detail-score" style={{ color: cfg.color }}>
            {fmt3(d.outlook_score)}
          </div>
          <div className="op-detail-score-label">{t('insights.overview.detail.outlookScore')}</div>
          <div className="op-detail-action" style={{ color: adaptColor(d.system_color) }}>{t('insights.overview.detail.actionPrefix')} {d.action_mode}</div>
        </div>
      </motion.div>

      <motion.div className="op-signal-card" style={{ borderLeftColor: adaptColor(d.system_color) }} {...fadeUp(0.05)}>
        <div className="op-signal-tag">{t('insights.overview.detail.executiveSignal')}</div>
        <div className="op-signal-text">{d.executive_signal}</div>
        <div className="op-signal-strategy">
          {t('insights.overview.detail.strategyPrefix')} <strong style={{ color: adaptColor(d.system_color) }}>{d.strategy.title}</strong> — {d.strategy.rationale}
        </div>
      </motion.div>

      <motion.div className="op-metrics-grid" {...fadeUp(0.1)}>
        {[
          { label: t('insights.overview.detail.metrics.currentScore'), value: (d.score_current ?? 0).toFixed(1), color: 'var(--text-primary)' },
          { label: t('insights.overview.detail.metrics.scoreNoRisk'), value: fmt3(d.score_no_risk), color: 'var(--color-info)', sub: `+${(d.risk_gain ?? 0).toFixed(3)}` },
          { label: t('insights.overview.detail.metrics.pSevere'), value: `${((d.severe_prob ?? 0) * 100).toFixed(0)}%`, color: (d.severe_prob ?? 0) > 0.5 ? 'var(--color-critical)' : (d.severe_prob ?? 0) > 0.2 ? 'var(--color-warning)' : 'var(--color-stable)' },
          { label: t('insights.overview.detail.metrics.pImprove'), value: `${((d.prob_up ?? 0) * 100).toFixed(0)}%`, color: (d.prob_up ?? 0) > 0.5 ? 'var(--color-stable)' : 'var(--color-warning)', sub: `${t('insights.overview.detail.metrics.pDecline')}: ${((d.prob_down ?? 0) * 100).toFixed(0)}%` },
          { label: t('insights.overview.detail.metrics.ppoImpact'), value: `+${(d.ppo_impact ?? 0).toFixed(3)}`, color: 'var(--color-stable)' },
        ].map((m, i) => (
          <div key={i} className="op-metric-card">
            <div className="op-metric-value" style={{ color: m.color }}>{m.value}</div>
            <div className="op-metric-label">{m.label}</div>
            {m.sub && <div className="op-metric-sub">{m.sub}</div>}
          </div>
        ))}
      </motion.div>

      <motion.div className="op-two-col" {...fadeUp(0.15)}>
        <div className="op-card">
          <div className="op-card-title">{t('insights.overview.detail.scoreDecomposition')}</div>
          <div className="op-card-sub">{t('insights.overview.detail.signalProfile', { signal: d.signal_profile })}</div>
          {[
            { label: t('insights.overview.detail.components.structuralRisk'), val: d.contributions.risk, color: 'var(--color-critical)' },
            { label: t('insights.overview.detail.components.forecastTrajectory'), val: d.contributions.forecast, color: 'var(--color-info)' },
            { label: t('insights.overview.detail.components.driverMomentum'), val: d.contributions.drivers, color: 'var(--color-stable)' },
          ].map((item, i) => {
            const isDom = item.label === d.dominant_driver
            const barColor = item.val < 0 ? 'var(--color-critical)' : item.color
            return (
              <div key={i} className="op-contrib-row">
                <div className="op-contrib-header">
                  <span className="op-contrib-label">
                    {item.label}
                    {isDom && <span className="op-contrib-dom" style={{ color: barColor }}>{t('insights.overview.detail.dominant')}</span>}
                  </span>
                  <span className="op-contrib-val" style={{ color: barColor }}>
                    {item.val < 0 ? '▼' : '▲'} {fmt4(item.val)}
                  </span>
                </div>
                <Bar value={item.val} max={contribTotal} color={barColor} />
              </div>
            )
          })}
          <div className="op-diagnosis">{t('insights.overview.detail.diagnosisPrefix')} {d.diagnosis}</div>
        </div>

        <div className="op-card">
          <div className="op-card-title">{t('insights.overview.detail.trajectoryTitle')}</div>
          <div className="op-forecast-grid">
            {[
              { label: t('insights.overview.detail.trajectory.worst'), val: d.forecast.p10 },
              { label: t('insights.overview.detail.trajectory.median'), val: d.forecast.p50 },
              { label: t('insights.overview.detail.trajectory.best'), val: d.forecast.p90 },
            ].map((f, i) => (
              <div key={i} className="op-forecast-cell">
                <div className="op-forecast-val" style={{ color: (f.val ?? 0) > 0 ? 'var(--color-stable)' : (f.val ?? 0) < -0.05 ? 'var(--color-critical)' : 'var(--color-warning)' }}>
                  {fmt3(f.val)}
                </div>
                <div className="op-forecast-label">{f.label}</div>
              </div>
            ))}
          </div>
          <div className="op-card-title" style={{ marginTop: '1rem' }}>{t('insights.overview.detail.systemSignalsTitle')}</div>
          {topPositive.length > 0 && <div className="op-signal-pos">{t('insights.overview.detail.improvingPrefix')} {topPositive.join(' · ')}</div>}
          {topNegative.length > 0 && <div className="op-signal-neg">{t('insights.overview.detail.deterioratingPrefix')} {topNegative.join(' · ')}</div>}
          {!topPositive.length && !topNegative.length && <div className="op-signal-none">{t('insights.overview.detail.noSignals')}</div>}
        </div>
      </motion.div>

      <motion.div className="op-two-col" {...fadeUp(0.2)}>
        <div className="op-card">
          <div className="op-card-title">{t('insights.overview.detail.strategyTitle', { title: d.strategy.title })}</div>
          <div className="op-card-sub">{d.strategy.rationale}</div>
          {strategyPhases.map((phase: string, i: number) => (
            <div key={i} className={`op-phase${i > 0 ? ' op-phase--border' : ''}`}>
              <div className="op-phase-label">{t('insights.overview.detail.phaseLabel', { number: i + 1 })}</div>
              <div className="op-phase-text">{phase}</div>
            </div>
          ))}
          <div className="op-warning">{t('insights.overview.detail.warningPrefix')} {d.strategy.warning}</div>
        </div>

        <div className="op-card">
          <div className="op-card-title">{t('insights.overview.detail.impactTitle')}</div>
          {[
            { label: t('insights.overview.detail.impact.ppoPolicy'), val: `+${(d.impact?.ppo_impact ?? 0).toFixed(3)}`, color: 'var(--color-stable)' },
            { label: t('insights.overview.detail.impact.riskRemoval'), val: `+${(d.impact?.risk_removal ?? 0).toFixed(3)}`, color: 'var(--color-info)' },
            { label: t('insights.overview.detail.impact.noAction'), val: (d.impact?.no_action ?? 0).toFixed(3), color: 'var(--color-critical)' },
            { label: t('insights.overview.detail.impact.pSevere'), val: `${((d.severe_prob ?? 0) * 100).toFixed(0)}%`, color: 'var(--color-warning)' },
          ].map((item, i) => (
            <div key={i} className="op-impact-row">
              <span className="op-impact-label">{item.label}</span>
              <span className="op-impact-val" style={{ color: item.color }}>{item.val}</span>
            </div>
          ))}
          <div className="op-roi" style={{ borderLeftColor: adaptColor(d.system_color) }}>
            {t('insights.overview.detail.roiPrefixShort')} <strong>{d.impact.short_term_roi}</strong> · {t('insights.overview.detail.roiPrefixLong')} <strong>{d.impact.long_term_roi}</strong>
          </div>
        </div>
      </motion.div>

      <motion.div className="op-confidence" {...fadeUp(0.25)}>
        <span>{t('insights.overview.detail.modelConfidence')} <strong>{d.confidence}%</strong></span>
        <span>{t('insights.overview.detail.tierLabel', { tier: d.tier })}</span>
        {d.fusion_alert  && <span>{t('insights.overview.detail.fusionAlertPrefix')} <strong>{d.fusion_alert}</strong></span>}
        {d.policy_focus  && <span>{t('insights.overview.detail.ppoPolicyPrefix')} <strong>{d.policy_focus}</strong></span>}
      </motion.div>

    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = Math.min(Math.abs(value) / max * 100, 100)
  return (
    <div className="op-bar-track">
      <div className="op-bar-fill" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}
