import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useDevice } from '../hooks/useDevice'
import '../styles/country-analysis.css'
import { authFetch } from '../services/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/* ── Types ── */

interface CountryMeta { code: string; country: string; verdict: string; tier: number; outlook_score: number }

interface AnalysisData {
  code: string; country: string; verdict: string; tier: number
  outlook_score: number; score_current: number; score_no_risk: number
  prob_up: number; prob_down: number; severe_prob: number
  contributions: { risk: number; forecast: number; drivers: number }
  forecast: { p10: number; p50: number; p90: number }
  drivers: { top_positive: string[]; top_negative: string[] }
  narrative: {
    system_type: string; system_color: string; action_mode: string
    executive_signal: string; signal_profile: string; diagnosis: string
    dominant_driver: string; confidence: number
  }
  strategy: {
    type: string; title: string; description: string
    do_not: string; key_insight: string
    phase1: string; phase2: string; phase3: string
    ppo_delta: number; risk_gain: number
  }
  impact?: { ppo_impact: number; risk_removal: number; no_action: number; short_term_roi: string; long_term_roi: string }
  simulation?: { ppo_delta: number; greedy_delta: number; random_delta: number; winner: string; episodes: number; steps: number }
  fusion_alert: string
}

interface SimTrace {
  steps: Array<{ step: number; cs_ppo: number; cs_greedy: number; cs_random: number }>
  episodes: number; fallback_tier: boolean
}

interface HistoryPoint { year: number; score: number }
interface ExplainResult { code: string; country: string; explanation: string }

/* ── Verdict palette ── */

const VERDICT: Record<string, { icon: string; color: string; bg: string }> = {
  CRITICAL:          { icon: '🔴', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  AT_RISK:           { icon: '🟠', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  LIKELY_DECLINE:    { icon: '🟡', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  STABLE:            { icon: '🔵', color: '#0B57D0', bg: 'rgba(11,87,208,0.1)' },
  IMPROVING_AT_RISK: { icon: '🟤', color: '#B45309', bg: 'rgba(180,83,9,0.1)' },
  LIKELY_IMPROVE:    { icon: '🟢', color: '#34A853', bg: 'rgba(52,168,83,0.1)' },
  STRONG_IMPROVE:    { icon: '💚', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
}

const vd = (verdict: string) => VERDICT[verdict] ?? VERDICT.STABLE

function fadeUp(delay = 0) {
  return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.4 } }
}

const fmt3 = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`
const fmt4 = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`

/* ── Component ── */

interface Props { verdictFilter?: string[]; tierFilter?: number[] }

export function CountryAnalysisPanel({ verdictFilter = [], tierFilter = [1, 2, 3, 4] }: Props) {
  const { isMobile, isTablet } = useDevice()
  const { t, i18n } = useTranslation()
  const chartHeight = isMobile ? 180 : isTablet ? 220 : 260
  const [countries, setCountries] = useState<CountryMeta[]>([])
  const [code, setCode]           = useState('')
  const [data, setData]           = useState<AnalysisData | null>(null)
  const [trace, setTrace]         = useState<SimTrace | null>(null)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [history, setHistory]     = useState<HistoryPoint[]>([])
  const [explain, setExplain]     = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainMode, setExplainMode] = useState<'POLICY_MAKER' | 'RESEARCHER'>('POLICY_MAKER')
  const [explainLength, setExplainLength] = useState<'SHORT' | 'LONG'>('LONG')
  const [explainMeta, setExplainMeta] = useState<{ provider?: string; model?: string; signal_mode?: string; ai_powered?: boolean } | null>(null)
  const verdictLabel = (verdict: string) => t(`insights.verdict.${verdict}`)

  useEffect(() => {
    setLoading(true)
    authFetch(`${API}/api/insights/countries`).then(r => r.json())
      .then((list: any) => {
        const arr = Array.isArray(list) ? list : (list?.countries ?? list?.data ?? [])
        setCountries(arr)
        if (arr.length) setCode(arr[0].code)
      })
      .catch(() => setCountries([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => countries.filter(c => {
    if (verdictFilter.length && !verdictFilter.includes(c.verdict)) return false
    if (tierFilter.length && !tierFilter.includes(c.tier)) return false
    if (search && !c.country.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [countries, verdictFilter, tierFilter, search])

  useEffect(() => {
    if (!code) return
    setDetailLoading(true); setData(null); setTrace(null)
    setHistory([]); setExplain(null)
    Promise.all([
      authFetch(`${API}/api/insights/country/${code}`).then(r => r.json()),
      authFetch(`${API}/api/insights/simulation/${code}`).then(r => r.ok ? r.json() : null).catch(() => null),
      authFetch(`${API}/api/insights/history/${code}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([d, t, h]) => { setData(d); setTrace(t); setHistory(h) }).finally(() => setDetailLoading(false))
  }, [code])

  const handleExplain = async () => {
    if (!code) return
    setExplainLoading(true)
    setExplain(null)
    setExplainMeta(null)
    try {
      const lang = i18n.language?.slice(0, 2) || 'en'
      const r = await authFetch(`${API}/api/insights/explain/${code}?lang=${lang}&mode=${explainMode}&length=${explainLength}`)
      const j = await r.json()
      setExplain(j.explanation)
      setExplainMeta({ provider: j.provider, model: j.model, signal_mode: j.signal_mode, ai_powered: j.ai_powered })
    } catch { setExplain('Explanation unavailable.') }
    finally { setExplainLoading(false) }
  }

  const chartData = useMemo(() => trace?.steps?.map(s => ({
    step: s.step,
    PPO:    +s.cs_ppo.toFixed(4),
    Greedy: +s.cs_greedy.toFixed(4),
    Random: +s.cs_random.toFixed(4),
  })) ?? [], [trace])

  if (loading) return <div className="ca-loading">{t('insights.analysis.loading')}</div>

  const d    = data
  const cfg  = d ? vd(d.verdict) : vd('STABLE')
  const sc   = d?.narrative.system_color ?? '#0B57D0'
  const contrib = d?.contributions ?? { risk: 0, forecast: 0, drivers: 0 }
  const total   = Math.max(Object.values(contrib).reduce((a, b) => a + Math.abs(b), 0), 0.001)

  return (
    <div className="ca-root">

      {/* ── TOP BAR: search + country list horizontal ── */}
      <div className="ca-topbar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('insights.analysis.searchPlaceholder')}
          className="ca-search"
        />
        <div className="ca-country-strip">
          {filtered.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCode(c.code)}
              className={`ca-country-chip${c.code === code ? ' ca-country-chip--active' : ''}`}
            >
              <span className="ca-chip-icon">{vd(c.verdict).icon}</span>
              <span className="ca-chip-name">{c.country}</span>
              <span className="ca-chip-tier">T{c.tier}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <span className="ca-no-results">{t('insights.analysis.noResults')}</span>
          )}
        </div>
      </div>

      {/* ── DETAIL ── */}
      <div className="ca-detail">
        {detailLoading && <div className="ca-loading">{t('insights.analysis.detailLoading')}</div>}

        {d && (
          <>
            {/* 1. HEADER */}
            <motion.section className="ca-card ca-header-card" style={{ borderLeftColor: cfg.color, background: cfg.bg }} {...fadeUp(0)}>
              <div className="ca-header-row">
                <div className="ca-header-left">
                  <span className="ca-header-icon">{cfg.icon}</span>
                  <div>
                    <div className="ca-header-country">{d.country}</div>
                    <div className="ca-header-verdict" style={{ color: cfg.color }}>
                      {verdictLabel(d.verdict)} · T{d.tier}
                    </div>
                  </div>
                </div>
                <div className="ca-header-right">
                  <div className="ca-header-score" style={{ color: cfg.color }}>{fmt3(d.outlook_score)}</div>
                  <div className="ca-header-score-label">{t('insights.overview.detail.outlookScore')}</div>
                  <div className="ca-header-system" style={{ color: sc }}>
                    {d.narrative.system_type} · {d.narrative.action_mode}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 2. EXECUTIVE SIGNAL */}
            <motion.section className="ca-card ca-signal-card" style={{ borderLeftColor: sc }} {...fadeUp(0.05)}>
              <div className="ca-signal-tag">{t('insights.analysis.executiveSignal')}</div>
              <div className="ca-signal-text">{d.narrative.executive_signal}</div>
              <div className="ca-signal-strategy">
                {t('insights.overview.detail.strategyTitle', { title: d.strategy.title })} — {d.strategy.description}
              </div>
            </motion.section>

            {/* 3. CORE METRICS */}
            <motion.div className="ca-metrics-grid" {...fadeUp(0.08)}>
              {[
                { label: t('insights.overview.detail.metrics.currentScore'),     value: d.score_current.toFixed(1) },
                { label: t('insights.overview.detail.metrics.scoreNoRisk'),    value: fmt3(d.score_no_risk), sub: `+${d.strategy.risk_gain.toFixed(3)} if risk removed` },
                { label: t('insights.overview.detail.metrics.pSevere'),         value: `${(d.severe_prob * 100).toFixed(0)}%` },
                { label: t('insights.overview.detail.metrics.pImprove'),        value: `${(d.prob_up * 100).toFixed(0)}%`, sub: t('insights.analysis.pDeclineSub', { value: (d.prob_down * 100).toFixed(0) }) },
                { label: t('insights.overview.detail.metrics.ppoImpact'), value: `+${(d.impact?.ppo_impact ?? d.strategy.ppo_delta).toFixed(3)}`, sub: t('insights.analysis.vsNoAction') },
              ].map((m, i) => (
                <div key={i} className="ca-metric-card">
                  <div className="ca-metric-label">{m.label}</div>
                  <div className="ca-metric-value">{m.value}</div>
                  {m.sub && <div className="ca-metric-sub">{m.sub}</div>}
                </div>
              ))}
            </motion.div>

            {/* 4. DECOMPOSITION + TRAJECTORY */}
            <motion.div className="ca-two-col" {...fadeUp(0.12)}>
              <section className="ca-card">
                <div className="ca-card-title">{t('insights.analysis.scoreDecomposition')}</div>
                <div className="ca-card-sub">{t('insights.overview.detail.signalProfile', { signal: d.narrative.signal_profile })}</div>
                {([
                  [t('insights.overview.detail.components.structuralRisk'),     contrib.risk,     '#DC2626'],
                  [t('insights.overview.detail.components.forecastTrajectory'), contrib.forecast, '#0B57D0'],
                  [t('insights.overview.detail.components.driverMomentum'),     contrib.drivers,  '#34A853'],
                ] as [string, number, string][]).map(([label, val, color]) => {
                  const pct = Math.min((Math.abs(val) / total) * 100, 100)
                  const isDom = label === d.narrative.dominant_driver
                  const barColor = val >= 0 ? color : '#DC2626'
                  return (
                    <div key={label} className="ca-contrib-row">
                      <div className="ca-contrib-header">
                        <span className="ca-contrib-label">
                          {label}
                          {isDom && <span className="ca-contrib-dom" style={{ color: barColor }}> · {t('insights.overview.detail.dominant')}</span>}
                        </span>
                        <span className="ca-contrib-val" style={{ color: barColor }}>
                          {val >= 0 ? '▲' : '▼'} {fmt4(val)}
                        </span>
                      </div>
                      <div className="ca-bar-track">
                        <div className="ca-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                  )
                })}
                <div className="ca-diagnosis" style={{ borderLeftColor: sc }}>{t('insights.overview.detail.diagnosisPrefix')} {d.narrative.diagnosis}</div>
              </section>

              <section className="ca-card">
                <div className="ca-card-title">{t('insights.analysis.trajectoryTitle')}</div>
                <div className="ca-forecast-grid">
                  {[
                    { label: t('insights.analysis.forecastLabels.worst'),  val: d.forecast.p10 },
                    { label: t('insights.analysis.forecastLabels.median'), val: d.forecast.p50 },
                    { label: t('insights.analysis.forecastLabels.best'),   val: d.forecast.p90 },
                  ].map((f, i) => (
                    <div key={i} className="ca-forecast-cell">
                      <div className="ca-forecast-val" style={{ color: f.val >= 0 ? '#34A853' : f.val < -0.05 ? '#DC2626' : '#F59E0B' }}>
                        {fmt3(f.val)} pts
                      </div>
                      <div className="ca-forecast-label">{f.label}</div>
                    </div>
                  ))}
                </div>
                {d.forecast.p50 < 0
                  ? <div className="ca-infobox" style={{ borderLeftColor: '#F59E0B' }}>{t('insights.analysis.infoboxNegative')}</div>
                  : <div className="ca-infobox" style={{ borderLeftColor: '#34A853' }}>{t('insights.analysis.infoboxPositive')}</div>
                }
                <div className="ca-card-title" style={{ marginTop: '1rem' }}>{t('insights.analysis.systemSignalsTitle')}</div>
                {d.drivers.top_positive.length > 0 && (
                  <div className="ca-signal-pos">📈 <strong>Improving:</strong> {d.drivers.top_positive.join(' · ')}</div>
                )}
                {d.drivers.top_negative.length > 0 && (
                  <div className="ca-signal-neg">📉 <strong>Deteriorating:</strong> {d.drivers.top_negative.join(' · ')}</div>
                )}
              </section>
            </motion.div>

            {/* 5. STRATEGY + IMPACT */}
            <motion.div className="ca-two-col" {...fadeUp(0.16)}>
              <section className="ca-card">
                <div className="ca-card-title">{t('insights.overview.detail.strategyTitle', { title: d.strategy.title })}</div>
                <div className="ca-card-sub">{d.strategy.description}</div>
                {[d.strategy.phase1, d.strategy.phase2, d.strategy.phase3].filter(Boolean).map((phase, i) => (
                  <div key={i} className={`ca-phase${i > 0 ? ' ca-phase--border' : ''}`}>
                    <div className="ca-phase-label">{t('insights.overview.detail.phaseLabel', { number: i + 1 })}</div>
                    <div className="ca-phase-text">{phase}</div>
                  </div>
                ))}
                {d.strategy.key_insight && (
                  <div className="ca-infobox" style={{ borderLeftColor: sc }}>{t('insights.overview.detail.ppoPolicyPrefix')} {d.strategy.key_insight}</div>
                )}
                {d.strategy.do_not && (
                  <div className="ca-warning">{t('insights.overview.detail.warningPrefix')} {d.strategy.do_not}</div>
                )}
              </section>

              <section className="ca-card">
                <div className="ca-card-title">{t('insights.overview.detail.impactTitle')}</div>
                {([
                  [t('insights.overview.detail.impact.ppoPolicy'), `+${(d.impact?.ppo_impact ?? d.strategy.ppo_delta).toFixed(3)}`,  '#34A853'],
                  [t('insights.overview.detail.impact.riskRemoval'), `+${(d.impact?.risk_removal ?? d.strategy.risk_gain).toFixed(3)}`, '#0B57D0'],
                  [t('insights.overview.detail.impact.noAction'),  '−0.300',                                '#DC2626'],
                  [t('insights.overview.detail.impact.pSevere'),   `${(d.severe_prob * 100).toFixed(0)}%`,  '#F59E0B'],
                ] as [string, string, string][]).map(([label, val, color]) => (
                  <div key={label} className="ca-impact-row">
                    <span className="ca-impact-label">{label}</span>
                    <span className="ca-impact-val" style={{ color }}>{val}</span>
                  </div>
                ))}
                {d.impact && (
                  <div className="ca-infobox" style={{ borderLeftColor: sc }}>
                    {t('insights.overview.detail.roiPrefixShort')} <strong>{d.impact.short_term_roi}</strong> · {t('insights.overview.detail.roiPrefixLong')} <strong>{d.impact.long_term_roi}</strong>
                  </div>
                )}
              </section>
            </motion.div>

            {/* 6. SIMULATION CHART */}
            {trace && chartData.length > 0 && (
              <motion.section className="ca-card" {...fadeUp(0.2)}>
                <div className="ca-card-title">{t('insights.analysis.simulationTitle')}</div>
                <div className="ca-card-sub">
                  {t('insights.analysis.simulationSubtitle', { episodes: trace.episodes })}
                  {trace.fallback_tier && <span className="ca-fallback-badge">{t('insights.analysis.fallbackBadge')}</span>}
                </div>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="step" stroke="#5F6368" style={{ fontSize: 10 }} />
                    <YAxis stroke="#5F6368" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EAED', color: '#1F1F1F', fontSize: 11 }} />
                    <Legend wrapperStyle={{ color: '#1F1F1F', fontSize: 11 }} />
                    <Line type="monotone" dataKey="PPO"    stroke="#DC2626" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Greedy" stroke="#0B57D0" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Random" stroke="#5F6368" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="ca-sim-grid">
                  {[
                    { label: `🤖 PPO`,    val: d.simulation?.ppo_delta    ?? 0, winner: d.simulation?.winner === 'PPO' },
                    { label: `🎯 Greedy`, val: d.simulation?.greedy_delta ?? 0, winner: d.simulation?.winner === 'Greedy' },
                    { label: `🎲 Random`, val: d.simulation?.random_delta ?? 0, winner: d.simulation?.winner === 'Random' },
                  ].map(m => (
                    <div key={m.label} className={`ca-sim-card${m.winner ? ' ca-sim-card--winner' : ''}`}>
                      <div className="ca-sim-label">{m.label}</div>
                      <div className="ca-sim-val">{m.val >= 0 ? '+' : ''}{m.val.toFixed(4)}</div>
                      {m.winner && <div className="ca-sim-winner">{t('insights.analysis.bestLabel')}</div>}
                    </div>
                  ))}
                </div>
                <div className="ca-sim-footer">
                  {t('insights.analysis.simulationFooter', {
                    episodes: d.simulation?.episodes ?? 0,
                    steps: d.simulation?.steps ?? 0,
                    winner: d.simulation?.winner ?? '—',
                  })}
                </div>
              </motion.section>
            )}

            {/* 6b. HISTORICAL SCORE */}
            {history.length > 0 && (
              <motion.section className="ca-card" {...fadeUp(0.19)}>
                <div className="ca-card-title">{t('insights.analysis.historicalScore')}</div>
                <div className="ca-card-sub">{t('insights.analysis.historySubtitle', { from: history[0].year, to: history[history.length - 1].year })}</div>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={history}>
                    <XAxis dataKey="year" stroke="#5F6368" style={{ fontSize: 10 }} />
                    <YAxis stroke="#5F6368" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EAED', color: '#1F1F1F', fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" stroke="#0B57D0" strokeWidth={1.5} dot={false} name="Composite Score" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.section>
            )}

            {/* 6c. EXPLAIN PANEL */}
            <motion.div className="ca-explain-row" {...fadeUp(0.21)}>
              <div className="ca-explain-controls">
                <div className="ca-explain-mode-group">
                  {(['POLICY_MAKER', 'RESEARCHER'] as const).map(m => (
                    <button key={m} type="button"
                      className={`ca-explain-mode-btn${explainMode === m ? ' ca-explain-mode-btn--active' : ''}`}
                      onClick={() => setExplainMode(m)}>
                      {m === 'POLICY_MAKER' ? t('insights.analysis.modePolicyMaker') : t('insights.analysis.modeResearcher')}
                    </button>
                  ))}
                </div>
                <div className="ca-explain-mode-group">
                  {(['SHORT', 'LONG'] as const).map(l => (
                    <button key={l} type="button"
                      className={`ca-explain-mode-btn${explainLength === l ? ' ca-explain-mode-btn--active' : ''}`}
                      onClick={() => setExplainLength(l)}>
                      {l === 'SHORT' ? t('insights.analysis.lengthBrief') : t('insights.analysis.lengthFull')}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="ca-explain-btn"
                  onClick={handleExplain}
                  disabled={explainLoading}
                >
                  {explainLoading ? t('insights.analysis.explainLoading') : t('insights.analysis.explainButton')}
                </button>
              </div>

              {explain && (
                <div className="ca-explain-panel">
                  <div className="ca-explain-header">
                    <div className="ca-explain-label">{t('insights.analysis.explainHeading')}</div>
                    {explainMeta && (
                      <div className="ca-explain-meta">
                        <span className={`ca-explain-badge${explainMeta.ai_powered ? ' ca-explain-badge--ai' : ' ca-explain-badge--fallback'}`}>
                          {explainMeta.ai_powered ? t('insights.analysis.aiBadgeAI') : t('insights.analysis.aiBadgeFallback')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ca-explain-text">
                    {explain.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**'))
                        return <div key={i} className="ca-explain-section-title">{line.replace(/\*\*/g, '')}</div>
                      if (line.startsWith('- '))
                        return <div key={i} className="ca-explain-bullet">• {line.slice(2)}</div>
                      if (line.trim() === '')
                        return <div key={i} className="ca-explain-spacer" />
                      return <div key={i} className="ca-explain-para">{line}</div>
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* 7. CONFIDENCE */}
            <motion.div className="ca-confidence" {...fadeUp(0.24)}>
              <span>{t('insights.overview.detail.modelConfidence')} <strong>{d.narrative.confidence}%</strong></span>
              <span>{t('insights.overview.detail.tierLabel', { tier: d.tier })}</span>
              {d.fusion_alert && <span>{t('insights.overview.detail.fusionAlertPrefix')} <strong>{d.fusion_alert}</strong></span>}
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
