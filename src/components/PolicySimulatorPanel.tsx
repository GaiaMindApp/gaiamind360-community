import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useDevice } from '../hooks/useDevice'
import { authFetch } from '../services/authFetch'
import '../styles/policy-simulator.css'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const ACTION_EMOJI: Record<string, string> = {
  'Baseline (no intervention)': '⏸️',
  'Green Energy':               '⚡',
  'Governance Reform':          '🏛️',
  'Human Development':          '👥',
  'Forest Protection':          '🌳',
}

const ACTION_COLOR: Record<string, string> = {
  'Baseline (no intervention)': '#5F6368',
  'Green Energy':               '#34A853',
  'Governance Reform':          '#0B57D0',
  'Human Development':          '#F59E0B',
  'Forest Protection':          '#16A34A',
}

interface CountryMeta { code: string; country: string; verdict: string; tier: number; outlook_score: number }

interface TraceRow {
  step: number; episode: number; tier: number; country: string
  cs_ppo: number; cs_greedy: number; cs_random: number
  action_ppo: string; action_greedy: string; action_random: string
  budget_left: number; fatigue: number; risk_score: number; regime: string
}

interface SimTrace {
  country: string; code: string; fallback_tier: boolean; episodes: number
  steps: Array<{ step: number; cs_ppo: number; cs_greedy: number; cs_random: number }>
  actions: { ppo: Record<string, number>; greedy: Record<string, number> }
  rows?: TraceRow[]
}

type ActionTab = 'PPO' | 'Greedy' | 'Random'

function fadeUp(delay = 0) {
  return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.4 } }
}

export function PolicySimulatorPanel() {
  const { isMobile, isTablet } = useDevice()
  const { t } = useTranslation()
  const chartHeight = isMobile ? 180 : isTablet ? 220 : 260
  const [countries, setCountries]     = useState<CountryMeta[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [trace, setTrace]             = useState<SimTrace | null>(null)
  const [actionTab, setActionTab]     = useState<ActionTab>('PPO')
  const [loading, setLoading]         = useState(true)
  const [traceLoading, setTraceLoading] = useState(false)
  const [error, setError]             = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTier, setActiveTier]   = useState<number | null>(null)

  useEffect(() => {
    authFetch(`${API}/api/insights/countries`)
      .then(r => r.json())
      .then((data: any) => {
        const list: CountryMeta[] = Array.isArray(data) ? data : (data?.countries ?? data?.data ?? [])
        setCountries(list)
        if (list.length) {
          setSelectedCode(list[0].code)
          setCountrySearch(list[0].country)
          setActiveTier(list[0].tier)
        }
      })
      .catch(e => setError(t('insights.simulator.errorLoadCountries', { message: e.message })))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCode) return
    setTraceLoading(true); setTrace(null); setError('')
    authFetch(`${API}/api/insights/simulation/${selectedCode}`)
      .then(r => r.json())
      .then((t: SimTrace) => setTrace(t))
      .catch(e => setError(t('insights.simulator.errorLoadSimulation', { message: e.message })))
      .finally(() => setTraceLoading(false))
  }, [selectedCode])

  const selected = countries.find(c => c.code === selectedCode)

  const suggestions = useMemo(() => {
    if (!countrySearch.trim()) return []
    return countries
      .filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase()))
      .slice(0, 8)
  }, [countries, countrySearch])

  const selectCountry = (c: CountryMeta) => {
    setSelectedCode(c.code)
    setCountrySearch(c.country)
    setActiveTier(c.tier)
    setShowSuggestions(false)
  }

  const avgTrajectory = useMemo(() => trace?.steps?.map(s => ({
    step:   s.step,
    [t('insights.simulator.chartLabels.ppoAvg')]:    +s.cs_ppo.toFixed(4),
    [t('insights.simulator.chartLabels.greedyAvg')]: +s.cs_greedy.toFixed(4),
    [t('insights.simulator.chartLabels.randomAvg')]: +s.cs_random.toFixed(4),
  })) ?? [], [trace, t])

  const strategyLabel = (strategy: ActionTab) => {
    if (strategy === 'PPO') return t('insights.simulator.strategy.ppo')
    if (strategy === 'Greedy') return t('insights.simulator.strategy.greedy')
    return t('insights.simulator.strategy.random')
  }

  const chartLabelKeys = {
    PPO: t('insights.simulator.chartLabels.ppoAvg'),
    Greedy: t('insights.simulator.chartLabels.greedyAvg'),
    Random: t('insights.simulator.chartLabels.randomAvg'),
  }

  // Final deltas (last - first per strategy)
  const finalPPO    = useMemo(() => {
    if (!trace?.steps?.length) return 0
    return +(trace.steps[trace.steps.length - 1].cs_ppo    - trace.steps[0].cs_ppo).toFixed(4)
  }, [trace])
  const finalGreedy = useMemo(() => {
    if (!trace?.steps?.length) return 0
    return +(trace.steps[trace.steps.length - 1].cs_greedy - trace.steps[0].cs_greedy).toFixed(4)
  }, [trace])
  const finalRandom = useMemo(() => {
    if (!trace?.steps?.length) return 0
    return +(trace.steps[trace.steps.length - 1].cs_random - trace.steps[0].cs_random).toFixed(4)
  }, [trace])

  const winner = useMemo(() => {
    const m = Math.max(finalPPO, finalGreedy, finalRandom)
    if (m === finalPPO)    return 'PPO'
    if (m === finalGreedy) return 'Greedy'
    return 'Random'
  }, [finalPPO, finalGreedy, finalRandom])

  const actionDist = useMemo(() => {
    if (!trace) return []
    const src = actionTab === 'PPO' ? trace.actions.ppo : trace.actions.greedy
    const total = Object.values(src).reduce((a, b) => a + b, 0) || 1
    return Object.entries(src)
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => ({ action, count, pct: Math.round((count / total) * 100) }))
  }, [trace, actionTab])

  if (loading) return <div className="ps-loading">{t('insights.simulator.loading')}</div>

  return (
    <div className="ps-root">

      {/* ── HEADER ── */}
      <motion.div className="ps-header" {...fadeUp(0)}>
        <div>
          <div className="ps-title">{t('insights.simulator.title')}</div>
        </div>
      </motion.div>

      {error && <div className="ps-error">{error}</div>}

      {/* ── SELECTORS ── */}
      <motion.div className="ps-selectors" {...fadeUp(0.05)}>
        <div className="ps-selector-group">
          <label className="ps-label">{t('insights.simulator.selector.tier')}</label>
          <div className="ps-tier-btns">
            {[1, 2, 3, 4].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setActiveTier(t)
                  const first = countries.find(c => c.tier === t)
                  if (first) selectCountry(first)
                }}
                className={`ps-tier-btn${activeTier === t ? ' ps-tier-btn--active' : ''}`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-selector-group ps-selector-country">
          <label className="ps-label">{t('insights.simulator.selector.country')}</label>
          <div className="ps-country-wrap">
            <input
              type="text"
              value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={t('insights.simulator.searchPlaceholder')}
              className="ps-country-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="ps-suggestions">
                {suggestions.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    className="ps-suggestion-item"
                    onMouseDown={() => selectCountry(c)}
                  >
                    <span className="ps-sug-name">{c.country}</span>
                    <span className="ps-sug-meta">T{c.tier} · {c.verdict.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── EPISODE METRICS ── */}
      {trace && (
        <motion.div className="ps-metrics-grid" {...fadeUp(0.08)}>
          {[
            { label: 'Episodes', value: String(trace.episodes) },
            { label: 'Steps',    value: String(trace.steps?.length ?? 0) },
            { label: 'Country',  value: trace.country },
          ].map(m => (
            <div key={m.label} className="ps-metric-card">
              <div className="ps-metric-label">{m.label}</div>
              <div className="ps-metric-value">{m.value}</div>
            </div>
          ))}
        </motion.div>
      )}

      {traceLoading && <div className="ps-loading">Loading simulation trace…</div>}

      {trace && !traceLoading && (
        <>
          {/* ── CHARTS ROW ── */}
          <motion.div className="ps-charts-row" {...fadeUp(0.12)}>
            {/* Average Trajectory */}
            <div className="ps-card">
              <div className="ps-card-title">{t('insights.simulator.cardTitles.avgTrajectory')}</div>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={avgTrajectory}>
                  <XAxis dataKey="step" stroke="#5F6368" style={{ fontSize: 10 }} />
                  <YAxis stroke="#5F6368" style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EAED', color: '#1F1F1F', fontSize: 11 }} />
                  <Legend wrapperStyle={{ color: '#1F1F1F', fontSize: 11 }} />
                  <Line type="monotone" dataKey={chartLabelKeys.PPO}    stroke="#DC2626" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey={chartLabelKeys.Greedy} stroke="#0B57D0" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey={chartLabelKeys.Random} stroke="#5F6368" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ── ACTION DISTRIBUTION + FINAL RESULT ── */}
          <motion.div className="ps-bottom-row" {...fadeUp(0.16)}>
            {/* Action Distribution */}
            <div className="ps-card">
              <div className="ps-card-title">{t('insights.simulator.cardTitles.actionDistribution')}</div>
              <div className="ps-action-tabs">
                {(['PPO', 'Greedy', 'Random'] as ActionTab[]).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActionTab(tab)}
                    className={`ps-action-tab${actionTab === tab ? ' ps-action-tab--active' : ''}`}
                  >
                    {strategyLabel(tab)}
                  </button>
                ))}
              </div>
              <div className="ps-action-list">
                {actionDist.length === 0 && (
                  <div className="ps-no-actions">{t('insights.simulator.noActionData')}</div>
                )}
                {actionDist.map(({ action, count, pct }) => {
                  const color = ACTION_COLOR[action] ?? '#5F6368'
                  const emoji = ACTION_EMOJI[action] ?? '▶️'
                  return (
                    <div key={action} className="ps-action-row" style={{ borderLeftColor: color }}>
                      <span className="ps-action-name">
                        {emoji} {action}
                      </span>
                      <span className="ps-action-stats" style={{ color }}>
                        {pct}% ({count}x)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Final Result */}
            <div className="ps-card">
              <div className="ps-card-title">{t('insights.simulator.cardTitles.finalResult')}</div>
              <div className="ps-final-grid">
                {[
                  { label: `🤖 ${strategyLabel('PPO')}`,    val: finalPPO,    key: 'PPO' },
                  { label: `🎯 ${strategyLabel('Greedy')}`, val: finalGreedy, key: 'Greedy' },
                  { label: `🎲 ${strategyLabel('Random')}`, val: finalRandom, key: 'Random' },
                ].map(m => (
                  <div key={m.key} className={`ps-final-card${winner === m.key ? ' ps-final-card--winner' : ''}`}>
                    {winner === m.key && <span className="ps-winner-badge">🏆</span>}
                    <div className="ps-final-label">{m.label}</div>
                    <div className="ps-final-val">{m.val >= 0 ? '+' : ''}{m.val.toFixed(4)}</div>
                  </div>
                ))}
              </div>
              <div className="ps-winner-text">
                {t('insights.simulator.bestStrategyLabel')} <strong>{strategyLabel(winner as ActionTab)}</strong>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
