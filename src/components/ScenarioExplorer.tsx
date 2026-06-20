import { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'motion/react'
import '../styles/scenario-explorer.css'
import { authFetch } from '../services/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

type ScenarioSource = 'causal' | 'extended'
type ViewMode = 'all' | 'topworst'

interface CountryItem {
  code: string; country: string; verdict: string; tier: number; outlook_score: number
}

interface ScenarioMeta {
  id: string; name: string; category: string; description: string
  source?: string; deadline?: string
}

interface ScenarioResult {
  scenario_id: string; scenario_name: string; category: string; description: string
  baseline_score: number; baseline_verdict: string
  scenario_score: number; scenario_verdict: string
  delta_score: number; verdict_change: boolean
  signal_shift?: Record<string, { baseline: number; delta: number }>
  feature_deltas?: Record<string, number>
}

interface TopWorstResult {
  best: ScenarioResult[]; worst: ScenarioResult[]
  total: number; positive: number; negative: number
  best_delta: number; worst_delta: number
}

const VERDICT_COLOR: Record<string, string> = {
  CRITICAL:          '#DC2626',
  AT_RISK:           '#F59E0B',
  LIKELY_DECLINE:    '#F59E0B',
  STABLE:            '#0B57D0',
  IMPROVING_AT_RISK: '#B45309',
  LIKELY_IMPROVE:    '#34A853',
  STRONG_IMPROVE:    '#16A34A',
}
const VERDICT_ICON: Record<string, string> = {
  CRITICAL: '🔴', AT_RISK: '🟠', LIKELY_DECLINE: '🟡',
  STABLE: '🔵', IMPROVING_AT_RISK: '🟤', LIKELY_IMPROVE: '🟢', STRONG_IMPROVE: '💚',
}

function fadeUp(delay = 0) {
  return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.4 } }
}

const fmt  = (v: number | undefined | null) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(4)}`; }
const fmt3 = (v: number | undefined | null) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(3)}`; }

export function ScenarioExplorer() {
  const [countries, setCountries]           = useState<CountryItem[]>([])
  const [countrySearch, setCountrySearch]   = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCode, setSelectedCode]     = useState('')
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null)
  const [catalog, setCatalog]               = useState<ScenarioMeta[]>([])
  const [categories, setCategories]         = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [source, setSource]                 = useState<ScenarioSource>('causal')
  const [mode, setMode]                     = useState<ViewMode>('all')
  const [topWorst, setTopWorst]             = useState<TopWorstResult | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [scenarioDetail, setScenarioDetail] = useState<ScenarioResult | null>(null)
  const deepdiveRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading]               = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [runLoading, setRunLoading]         = useState(false)
  const [error, setError]                   = useState('')

  // Load countries
  useEffect(() => {
    authFetch(`${API}/api/outlook/countries?sort=score`)
      .then(r => r.json())
      .then(p => {
        const list: CountryItem[] = Array.isArray(p) ? p : (p.countries || [])
        setCountries(list)
        if (list.length) selectCountry(list[0])
      })
      .catch(() => setError('Failed to load countries.'))
      .finally(() => setLoading(false))
  }, [])

  // Load catalog + categories when country or source changes
  useEffect(() => {
    if (!selectedCode) return
    loadCatalog()
    setTopWorst(null); setScenarioDetail(null); setMode('all')
  }, [selectedCode, source])

  function selectCountry(c: CountryItem) {
    setSelectedCode(c.code)
    setSelectedCountry(c)
    setCountrySearch(c.country)
    setShowSuggestions(false)
  }

  async function loadCatalog() {
    setCatalogLoading(true)
    try {
      const [catRes, catgRes] = await Promise.all([
        authFetch(`${API}/api/scenario/catalog${source === 'extended' ? '/extended' : ''}`),
        authFetch(`${API}/api/scenario/categories`),
      ])
      const catData  = await catRes.json()
      const catgData = await catgRes.json()
      setCatalog(catData.scenarios || [])
      const allCats = ['All', ...(catgData.causal || []), ...(catgData.extended || [])]
        .filter((v, i, a) => a.indexOf(v) === i)
      setCategories(allCats)
      setCategoryFilter('All')
      setSelectedScenarioId('')
      setScenarioDetail(null)
    } catch {
      setError('Failed to load scenario catalog.')
    } finally {
      setCatalogLoading(false)
    }
  }

  async function loadTopWorst() {
    if (!selectedCode) return
    setRunLoading(true); setTopWorst(null); setScenarioDetail(null)
    try {
      const r = await authFetch(`${API}/api/scenario/run/all/${selectedCode}?source=${source}`)
      setTopWorst(await r.json())
    } catch { setError('Failed to load Top/Worst.') }
    finally { setRunLoading(false) }
  }

  async function runScenario(id: string) {
    if (!selectedCode || !id) return
    setSelectedScenarioId(id); setRunLoading(true); setScenarioDetail(null)
    try {
      const r = await authFetch(`${API}/api/scenario/run/${selectedCode}/${id}`)
      setScenarioDetail(await r.json())
      // scroll to deep-dive result on mobile/tablet
      setTimeout(() => deepdiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch { setError('Failed to run scenario.') }
    finally { setRunLoading(false) }
  }

  const suggestions = useMemo(() =>
    countrySearch.trim()
      ? countries.filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 8)
      : [],
    [countries, countrySearch])

  const filtered = useMemo(() =>
    catalog.filter(s => categoryFilter === 'All' || s.category === categoryFilter),
    [catalog, categoryFilter])

  if (loading) return <div className="se-loading">Loading Scenario Engine…</div>

  return (
    <div className="se-root">

      {error && <div className="se-error">{error}</div>}

      {/* ── CONTROLS ── */}
      <motion.div className="se-controls" {...fadeUp(0)}>

        {/* Country search */}
        <div className="se-control-group">
          <label className="se-label">Country</label>
          <div className="se-search-wrap">
            <input
              type="text"
              value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="🔍  Search country…"
              className="se-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="se-suggestions">
                {suggestions.map(c => (
                  <button key={c.code} type="button" className="se-sug-item" onMouseDown={() => selectCountry(c)}>
                    <span className="se-sug-name">{c.country}</span>
                    <span className="se-sug-meta">T{c.tier} · {c.verdict.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="se-control-group">
          <label className="se-label">Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="se-select">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* View mode */}
        <div className="se-control-group">
          <label className="se-label">View</label>
          <div className="se-mode-btns">
            <button type="button" onClick={() => setMode('all')} className={`se-mode-btn${mode === 'all' ? ' se-mode-btn--active' : ''}`}>All</button>
            <button type="button" onClick={() => { setMode('topworst'); if (!topWorst) loadTopWorst() }} className={`se-mode-btn${mode === 'topworst' ? ' se-mode-btn--active' : ''}`}>Top/Worst</button>
          </div>
        </div>

        {/* Catalog source */}
        <div className="se-control-group">
          <label className="se-label">Scenario catalog</label>
          <div className="se-mode-btns">
            <button type="button" onClick={() => setSource('causal')} className={`se-mode-btn${source === 'causal' ? ' se-mode-btn--active' : ''}`}>🔬 50 Causal</button>
            <button type="button" onClick={() => setSource('extended')} className={`se-mode-btn${source === 'extended' ? ' se-mode-btn--active' : ''}`}>🌍 100 Real</button>
          </div>
        </div>
      </motion.div>

      {/* ── BASELINE CARD ── */}
      {selectedCountry && (
        <motion.div className="se-baseline" {...fadeUp(0.05)}>
          <div className="se-baseline-left">
            <span className="se-baseline-tag">Baseline</span>
            <span className="se-baseline-icon">{VERDICT_ICON[selectedCountry.verdict] ?? '🔵'}</span>
            <span className="se-baseline-score" style={{ color: VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0' }}>
              {fmt3(selectedCountry.outlook_score)}
            </span>
            <span className="se-baseline-verdict" style={{ color: VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0' }}>
              {selectedCountry.verdict.replace(/_/g, ' ')}
            </span>
          </div>
          {topWorst && (
            <div className="se-baseline-stats">
              {[
                { label: 'Scenarios', value: String(topWorst.total ?? 0) },
                { label: 'Best',      value: fmt((topWorst.best?.[0]?.delta_score)),  color: '#34A853' },
                { label: 'Worst',     value: fmt((topWorst.worst?.[0]?.delta_score)), color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="se-stat">
                  <div className="se-stat-val" style={{ color: s.color }}>{s.value}</div>
                  <div className="se-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="se-main-grid">

        {/* LEFT: Catalog list */}
        <motion.div className="se-catalog" {...fadeUp(0.1)}>
          <div className="se-catalog-header">
            <span className="se-catalog-title">Scenario catalog</span>
            <span className="se-catalog-count">{filtered.length} scenarios</span>
          </div>
          {catalogLoading && <div className="se-loading">Loading catalog…</div>}
          {!catalogLoading && mode === 'all' && (() => {
            if (categoryFilter !== 'All') {
              // Filtered view — flat list, no category header
              return (
                <div className="se-catalog-list">
                  {filtered.slice(0, 50).map(s => (
                    <button key={s.id} type="button" onClick={() => runScenario(s.id)}
                      className={`se-scenario-btn${selectedScenarioId === s.id ? ' se-scenario-btn--active' : ''}`}>
                      <div className="se-scenario-header">
                        <span className="se-scenario-id">{s.id}</span>
                        <span className="se-scenario-name">{s.name}</span>
                        {s.deadline && <span className="se-scenario-deadline">{s.deadline}</span>}
                      </div>
                      <div className="se-scenario-desc">{s.description}</div>
                    </button>
                  ))}
                </div>
              )
            }
            // All — group by category
            const groups: Record<string, typeof filtered> = {}
            filtered.forEach(s => {
              if (!groups[s.category]) groups[s.category] = []
              groups[s.category].push(s)
            })
            return (
              <div className="se-catalog-list">
                {Object.entries(groups).map(([cat, items]) => (
                  <div key={cat} className="se-cat-group">
                    <div className="se-cat-group-header">{cat} <span className="se-cat-group-count">{items.length}</span></div>
                    {items.map(s => (
                      <button key={s.id} type="button" onClick={() => runScenario(s.id)}
                        className={`se-scenario-btn${selectedScenarioId === s.id ? ' se-scenario-btn--active' : ''}`}>
                        <div className="se-scenario-header">
                          <span className="se-scenario-id">{s.id}</span>
                          <span className="se-scenario-name">{s.name}</span>
                          {s.deadline && <span className="se-scenario-deadline">{s.deadline}</span>}
                        </div>
                        <div className="se-scenario-desc">{s.description}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )
          })()}
          {!catalogLoading && mode === 'topworst' && (
            <>
              {runLoading && <div className="se-loading">Running all scenarios…</div>}
              {!runLoading && !topWorst && (
                <div className="se-deepdive-empty">Failed to load Top/Worst. The backend may have returned an error.</div>
              )}
              {!runLoading && topWorst && (
                <div className="se-topworst">
                  <div className="se-tw-section">
                    <div className="se-tw-title">🟢 Best Scenarios</div>
                    {(topWorst.best ?? []).map(s => (
                      <button key={s.scenario_id} type="button" onClick={() => runScenario(s.scenario_id)}
                        className={`se-tw-row${selectedScenarioId === s.scenario_id ? ' se-tw-row--active' : ''}`}>
                        <div className="se-tw-name">{s.scenario_id} · {s.scenario_name}</div>
                        <div className="se-tw-meta">
                          <span className="se-tw-cat">{s.category}</span>
                          <span className="se-tw-delta" style={{ color: '#34A853' }}>{fmt(s.delta_score)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="se-tw-section">
                    <div className="se-tw-title">🔴 Worst Scenarios</div>
                    {(topWorst.worst ?? []).map(s => (
                      <button key={s.scenario_id} type="button" onClick={() => runScenario(s.scenario_id)}
                        className={`se-tw-row${selectedScenarioId === s.scenario_id ? ' se-tw-row--active' : ''}`}>
                        <div className="se-tw-name">{s.scenario_id} · {s.scenario_name}</div>
                        <div className="se-tw-meta">
                          <span className="se-tw-cat">{s.category}</span>
                          <span className="se-tw-delta" style={{ color: '#DC2626' }}>{fmt(s.delta_score)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* RIGHT: Deep-dive */}
        <motion.div className="se-deepdive" ref={deepdiveRef} {...fadeUp(0.12)}>
          <div className="se-deepdive-title">🔬 Deep-Dive: Single Scenario</div>

          {!scenarioDetail && !runLoading && (
            <div className="se-deepdive-empty">Select a scenario from the catalog to see its impact.</div>
          )}
          {runLoading && <div className="se-loading">Running scenario…</div>}

          {scenarioDetail && !runLoading && (
            <>
              {/* Scores */}
              <div className="se-dd-scores">
                <div className="se-dd-score-row">
                  <span className="se-dd-score-label">Baseline Score</span>
                  <span className="se-dd-score-val">{fmt3(scenarioDetail.baseline_score)}</span>
                </div>
                <div className="se-dd-score-row">
                  <span className="se-dd-score-label">Scenario Score</span>
                  <span className="se-dd-score-val" style={{ color: scenarioDetail.delta_score >= 0 ? '#34A853' : '#DC2626' }}>
                    {fmt3(scenarioDetail.scenario_score)}
                    <span className="se-dd-delta">{fmt(scenarioDetail.delta_score)}</span>
                  </span>
                </div>
                <div className="se-dd-score-row">
                  <span className="se-dd-score-label">New Verdict</span>
                  <span className="se-dd-score-val" style={{ color: VERDICT_COLOR[scenarioDetail.scenario_verdict] ?? '#0B57D0' }}>
                    {scenarioDetail.scenario_verdict.replace(/_/g, ' ')}
                    {scenarioDetail.verdict_change && <span className="se-dd-changed">changed ✅</span>}
                  </span>
                </div>
                <div className="se-dd-score-row">
                  <span className="se-dd-score-label">Δ Score</span>
                  <span className="se-dd-score-val" style={{ color: scenarioDetail.delta_score >= 0 ? '#34A853' : '#DC2626', fontWeight: 800 }}>
                    {fmt(scenarioDetail.delta_score)}
                  </span>
                </div>
              </div>

              {/* Signal shift */}
              {scenarioDetail.signal_shift && (
                <>
                  <div className="se-dd-subtitle">Signal shift (baseline → scenario)</div>
                  <div className="se-signal-grid">
                    {Object.entries(scenarioDetail.signal_shift).map(([sig, vals]) => (
                      <div key={sig} className="se-signal-row">
                        <span className="se-signal-name">{sig}</span>
                        <span className="se-signal-base">{vals.baseline.toFixed(4)}</span>
                        <span className="se-signal-delta" style={{ color: vals.delta >= 0 ? '#34A853' : '#DC2626' }}>
                          {vals.delta >= 0 ? '+' : ''}{vals.delta.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Feature deltas */}
              {scenarioDetail.feature_deltas && Object.keys(scenarioDetail.feature_deltas).length > 0 && (
                <>
                  <div className="se-dd-subtitle">📋 Feature deltas</div>
                  <div className="se-feature-list">
                    {Object.entries(scenarioDetail.feature_deltas)
                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                      .slice(0, 10)
                      .map(([feat, delta]) => (
                        <div key={feat} className="se-feature-row">
                          <span className="se-feature-name">{feat}</span>
                          <span className="se-feature-delta" style={{ color: delta >= 0 ? '#34A853' : '#DC2626' }}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(4)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
