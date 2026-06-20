import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import '../styles/custom-scenario.css'
import { authFetch } from '../services/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const POLICY_ACTIONS: Record<string, Array<{ id: string; label: string; description: string; icon: string }>> = {
  '🌍 Climate': [
    { id: 'carbon_tax',           label: 'Carbon Tax',                   description: 'Price on CO₂ emissions — revenue recycled to clean energy',     icon: '💰' },
    { id: 'renewable_investment', label: 'Renewable Energy Investment',   description: 'Public investment in solar, wind and hydro capacity',            icon: '⚡' },
    { id: 'deforestation_ban',    label: 'Deforestation Ban',             description: 'Halt illegal deforestation — enforce forest protection laws',     icon: '🌳' },
    { id: 'methane_regulation',   label: 'Methane Regulation',            description: 'Livestock and agriculture methane reduction programme',           icon: '🐄' },
    { id: 'climate_adaptation',   label: 'Climate Adaptation Fund',       description: 'Infrastructure investment to reduce climate vulnerability',       icon: '🛡️' },
  ],
  '💰 Economy': [
    { id: 'public_investment',    label: 'Public Investment Programme',   description: 'State-led infrastructure and productive capacity investment',     icon: '🏗️' },
    { id: 'trade_liberalisation', label: 'Trade Liberalisation',          description: 'Reduce tariffs and open markets — export-led growth',            icon: '🌐' },
    { id: 'employment_programme', label: 'Employment Programme',          description: 'Active labour market policies — job creation and skills',         icon: '👷' },
    { id: 'poverty_reduction',    label: 'Poverty Reduction Programme',   description: 'Targeted transfers, social protection and basic services',        icon: '🤝' },
    { id: 'digital_economy',      label: 'Digital Economy Strategy',      description: 'Broadband rollout, e-government, digital skills',                icon: '💻' },
  ],
  '🏛️ Governance': [
    { id: 'anti_corruption',      label: 'Anti-Corruption Reform',        description: 'Independent anti-corruption agency with prosecutorial power',     icon: '⚖️' },
    { id: 'judicial_reform',      label: 'Judicial Reform',               description: 'Independent judiciary, rule of law, contract enforcement',        icon: '🏛️' },
    { id: 'transparency',         label: 'Transparency & Open Government',description: 'Open data, freedom of information, public accountability',        icon: '🔍' },
    { id: 'security_reform',      label: 'Security Sector Reform',        description: 'Police reform, violence reduction, organised crime crackdown',    icon: '🛡️' },
    { id: 'decentralisation',     label: 'Decentralisation Reform',       description: 'Transfer power to local governments — improve service delivery',  icon: '🗺️' },
  ],
  '🏥 Health & Social': [
    { id: 'universal_healthcare', label: 'Universal Healthcare',          description: 'Expand coverage — preventive care, maternal health, vaccination', icon: '🏥' },
    { id: 'education_investment', label: 'Education Investment',          description: 'Universal access, teacher training, school infrastructure',       icon: '📚' },
    { id: 'wash_programme',       label: 'Water & Sanitation (WASH)',     description: 'Clean water and sanitation infrastructure for all',               icon: '💧' },
    { id: 'food_security',        label: 'Food Security Programme',       description: 'Agricultural support, nutrition programmes, food distribution',   icon: '🌾' },
    { id: 'urbanisation_planning',label: 'Urban Planning & Housing',      description: 'Planned urbanisation — infrastructure, transport, housing',       icon: '🏙️' },
  ],
}

const SLIDER_GROUPS: Record<string, Array<{ key: string; label: string }>> = {
  '🌡️ Climate':       [{ key: 'co2_pc', label: 'CO₂ per capita' }, { key: 'temp_anomaly', label: 'Temperature Anomaly' }, { key: 'renewable_share', label: 'Renewable Energy' }, { key: 'forest_pct', label: 'Forest Cover' }, { key: 'methane_agriculture', label: 'Methane Agriculture' }],
  '💰 Economy':       [{ key: 'gdp_pc', label: 'GDP per capita' }, { key: 'unemployment_rate', label: 'Unemployment Rate' }, { key: 'hdi', label: 'Human Dev. Index' }, { key: 'internet_pct', label: 'Internet Access' }],
  '🏛️ Governance':   [{ key: 'democracy_idx', label: 'Democracy Index' }, { key: 'civil_liberties', label: 'Civil Liberties' }, { key: 'corruption_political', label: 'Corruption' }, { key: 'homicide_rate', label: 'Homicide Rate' }],
  '🏥 Health & Social':[{ key: 'life_exp', label: 'Life Expectancy' }, { key: 'infant_mortality', label: 'Infant Mortality' }, { key: 'water_access', label: 'Water Access' }, { key: 'sanitation_access', label: 'Sanitation Access' }],
}

const INTENSITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const
const INTENSITY_LABELS: Record<string, string> = { LOW: '🟡 Low', MEDIUM: '🟠 Med', HIGH: '🔴 High' }
const INTENSITY_COLORS: Record<string, string> = { LOW: '#FFD166', MEDIUM: '#FF8C42', HIGH: '#DC2626' }

const VERDICT_COLOR: Record<string, string> = {
  CRITICAL: '#DC2626', AT_RISK: '#F59E0B', LIKELY_DECLINE: '#F59E0B',
  STABLE: '#0B57D0', IMPROVING_AT_RISK: '#B45309', LIKELY_IMPROVE: '#34A853', STRONG_IMPROVE: '#16A34A',
}
const VERDICT_ICON: Record<string, string> = {
  CRITICAL: '🔴', AT_RISK: '🟠', LIKELY_DECLINE: '🟡',
  STABLE: '🔵', IMPROVING_AT_RISK: '🟤', LIKELY_IMPROVE: '🟢', STRONG_IMPROVE: '💚',
}

const NL_EXAMPLES = [
  'Reduce CO2 emissions by 30% and increase renewable energy by 25%',
  'What if corruption decreases by 40% and GDP grows 5%?',
  'Universal healthcare spending +3% GDP and WASH coverage +20%',
  'Paris Agreement compliance with full renewable transition',
]

type Mode = 'policy' | 'sliders' | 'nl' | 'composer'

interface CountryItem { code: string; country: string; verdict: string; outlook_score: number; insight?: string }
interface ParsedFormula { formula: string; params: Record<string, number>; matched_on: string; confidence: number }
interface SimResult {
  baseline_score: number; baseline_verdict: string
  scenario_score: number; scenario_verdict: string
  delta_score: number; verdict_change: boolean
  parsed_formulas?: (string | ParsedFormula)[]
  feature_deltas?: Record<string, number>
  source?: string
}

function fadeUp(delay = 0) {
  return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.4 } }
}

const fmt3 = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`

function ResultCard({ result }: { result: SimResult }) {
  const bc = VERDICT_COLOR[result.baseline_verdict] ?? '#0B57D0'
  const sc = VERDICT_COLOR[result.scenario_verdict] ?? '#0B57D0'
  const dc = result.delta_score >= 0 ? '#34A853' : '#DC2626'
  return (
    <div className="cs-result">
      <div className="cs-result-row">
        <div className="cs-result-cell">
          <div className="cs-result-tag">BASELINE</div>
          <div className="cs-result-score" style={{ color: bc }}>{VERDICT_ICON[result.baseline_verdict]} {fmt3(result.baseline_score)}</div>
          <div className="cs-result-verdict" style={{ color: bc }}>{result.baseline_verdict.replace(/_/g, ' ')}</div>
        </div>
        <div className="cs-result-arrow">→</div>
        <div className="cs-result-cell">
          <div className="cs-result-tag">SCENARIO</div>
          <div className="cs-result-score" style={{ color: sc }}>{VERDICT_ICON[result.scenario_verdict]} {fmt3(result.scenario_score)}</div>
          <div className="cs-result-verdict" style={{ color: sc }}>{result.scenario_verdict.replace(/_/g, ' ')}</div>
        </div>
        <div className="cs-result-cell">
          <div className="cs-result-tag">Δ SCORE</div>
          <div className="cs-result-delta" style={{ color: dc }}>
            {result.delta_score > 0 ? '▲' : result.delta_score < 0 ? '▼' : '─'} {Math.abs(result.delta_score).toFixed(4)}
          </div>
          <div className="cs-result-change" style={{ color: result.verdict_change ? '#34A853' : '#5F6368' }}>
            {result.verdict_change ? '✅ Verdict changed' : 'No verdict change'}
          </div>
        </div>
      </div>
      {result.parsed_formulas && result.parsed_formulas.length > 0 && (
        <div className="cs-formulas">
          <div className="cs-formulas-title">Parsed formulas</div>
          {result.parsed_formulas.map((f, i) => (
            <div key={i} className="cs-formula-item">
              🔬 {typeof f === 'string' ? f : `${f.formula}(${Object.entries(f.params ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')}) ← "${f.matched_on}"`}
            </div>
          ))}
        </div>
      )}
      {result.feature_deltas && Object.keys(result.feature_deltas).length > 0 && (
        <div className="cs-formulas">
          <div className="cs-formulas-title">Feature deltas · {result.source ?? 'pipeline'}</div>
          {Object.entries(result.feature_deltas)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 8)
            .map(([feat, delta]) => (
              <div key={feat} className="cs-formula-item cs-formula-delta" style={{ borderLeftColor: delta >= 0 ? 'rgba(0,230,118,0.4)' : 'rgba(248,113,113,0.4)' }}>
                <span className="cs-delta-feat">{feat}</span>
                <span className="cs-delta-val" style={{ color: delta >= 0 ? '#34A853' : '#DC2626' }}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(4)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function CustomScenarioBuilder() {
  const [countries, setCountries]         = useState<CountryItem[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [showSug, setShowSug]             = useState(false)
  const [selectedCode, setSelectedCode]   = useState('')
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null)
  const [mode, setMode]                   = useState<Mode>('policy')
  const [result, setResult]               = useState<SimResult | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [selections, setSelections]       = useState<Record<string, string>>({})
  const [sliders, setSliders]             = useState<Record<string, number>>({})
  const [nlText, setNlText]               = useState('')
  const [composerItems, setComposerItems] = useState<Array<{ label: string; action_id: string; intensity: string }>>([])
  const [compAction, setCompAction]       = useState('')
  const [compIntensity, setCompIntensity] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM')

  const allActions = useMemo(() => Object.values(POLICY_ACTIONS).flat(), [])

  useEffect(() => {
    authFetch(`${API}/api/outlook/countries?sort=score&limit=250`)
      .then(r => r.json())
      .then(p => {
        const list: CountryItem[] = Array.isArray(p) ? p : (p.countries || [])
        setCountries(list)
        if (list.length) selectCountry(list[0])
      })
      .catch(() => setError('Failed to load countries.'))
  }, [])

  const suggestions = useMemo(() =>
    countrySearch.trim()
      ? countries.filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 8)
      : [],
    [countries, countrySearch])

  function selectCountry(c: CountryItem) {
    setSelectedCode(c.code); setSelectedCountry(c)
    setCountrySearch(c.country); setShowSug(false); setResult(null)
  }

  async function post(path: string, body: object) {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await authFetch(`${API}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.detail || 'Simulation failed.') }
      setResult(await r.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  function runPolicy() {
    if (!Object.keys(selections).length) { setError('Select at least one intervention.'); return }
    post('/api/scenario/policy-bundle', {
      code: selectedCode,
      selections: Object.entries(selections).map(([action_id, intensity]) => ({ action_id, intensity })),
    })
  }

  function runSliders() {
    const active = Object.entries(sliders).filter(([, v]) => v !== 0)
    if (!active.length) { setError('Move at least one slider.'); return }
    post('/api/scenario/sliders', { code: selectedCode, feature_deltas: Object.fromEntries(active) })
  }

  function runNL() {
    if (!nlText.trim()) { setError('Enter a scenario description.'); return }
    post('/api/scenario/custom', { code: selectedCode, description: nlText })
  }

  function runComposer() {
    if (!composerItems.length) { setError('Add at least one shock.'); return }
    post('/api/scenario/policy-bundle', {
      code: selectedCode,
      selections: composerItems.map(i => ({ action_id: i.action_id, intensity: i.intensity })),
    })
  }

  return (
    <div className="cs-root">

      {/* ── COUNTRY + BASELINE ── */}
      <motion.div className="cs-top" {...fadeUp(0)}>
        <div className="cs-country-wrap">
          <label className="cs-label">Country</label>
          <div className="cs-search-wrap">
            <input value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setShowSug(true) }}
              onFocus={() => setShowSug(true)}
              onBlur={e => {
                const target = e.relatedTarget as HTMLElement | null
                if (!target || !target.closest('.cs-suggestions')) setShowSug(false)
              }}
              placeholder="🔍  Search country…" className="cs-input" />
            {showSug && suggestions.length > 0 && (
              <div className="cs-suggestions">
                {suggestions.map(c => (
                  <button key={c.code} type="button" className="cs-sug-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectCountry(c)}>
                    <span className="cs-sug-name">{c.country}</span>
                    <span className="cs-sug-meta">{c.verdict.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedCountry && (
          <div className="cs-baseline" style={{ borderLeftColor: VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0', background: `${VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0'}10` }}>
            <div className="cs-baseline-left">
              <span className="cs-baseline-tag">BASELINE</span>
              <span className="cs-baseline-icon">{VERDICT_ICON[selectedCountry.verdict] ?? '🔵'}</span>
              <span className="cs-baseline-score" style={{ color: VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0' }}>{fmt3(selectedCountry.outlook_score ?? 0)}</span>
              <span className="cs-baseline-verdict" style={{ color: VERDICT_COLOR[selectedCountry.verdict] ?? '#0B57D0' }}>{selectedCountry.verdict.replace(/_/g, ' ')}</span>
            </div>
            {selectedCountry.insight && <div className="cs-baseline-insight">{selectedCountry.insight.slice(0, 120)}</div>}
          </div>
        )}
      </motion.div>

      {/* ── MODE TABS ── */}
      <motion.div className="cs-mode-tabs" {...fadeUp(0.05)}>
        <span className="cs-mode-label">Build your scenario:</span>
        {([
          { id: 'policy',   label: '🎯 Policy Actions' },
          { id: 'sliders',  label: '🎚️ Advanced Sliders' },
          { id: 'nl',       label: '✍️ Natural Language' },
          { id: 'composer', label: '🧩 Composer' },
        ] as { id: Mode; label: string }[]).map(m => (
          <button key={m.id} type="button"
            onClick={() => { setMode(m.id); setResult(null); setError('') }}
            className={`cs-mode-tab${mode === m.id ? ' cs-mode-tab--active' : ''}`}>
            {m.label}
          </button>
        ))}
      </motion.div>

      {error && <div className="cs-error">{error}</div>}

      {/* ── POLICY ACTIONS ── */}
      {mode === 'policy' && (
        <motion.div className="cs-panel" {...fadeUp(0.08)}>
          <div className="cs-panel-desc">Select interventions and intensity — then simulate</div>
          <div className="cs-panel-caption">Each action maps to scientifically-grounded feature deltas</div>
          {Object.entries(POLICY_ACTIONS).map(([cat, actions]) => (
            <div key={cat} className="cs-policy-group">
              <div className="cs-policy-cat">{cat}</div>
              <div className="cs-policy-grid">
                {actions.map(action => {
                  const checked = action.id in selections
                  return (
                    <div key={action.id} className={`cs-policy-card${checked ? ' cs-policy-card--active' : ''}`}>
                      <label className="cs-policy-check-label" title={action.description}>
                        <input type="checkbox" checked={checked} className="cs-checkbox"
                          onChange={e => setSelections(prev => {
                            const next = { ...prev }
                            if (e.target.checked) next[action.id] = 'MEDIUM'
                            else delete next[action.id]
                            return next
                          })} />
                        <span className="cs-policy-icon">{action.icon}</span>
                        <span className="cs-policy-label">{action.label}</span>
                      </label>
                      {checked && (
                        <div className="cs-intensity-row">
                          {INTENSITY_LEVELS.map(lvl => (
                            <button key={lvl} type="button" className="cs-intensity-btn"
                              onClick={() => setSelections(prev => ({ ...prev, [action.id]: lvl }))}
                              style={{
                                borderColor: selections[action.id] === lvl ? INTENSITY_COLORS[lvl] : 'rgba(224,247,250,0.1)',
                                color: selections[action.id] === lvl ? INTENSITY_COLORS[lvl] : 'rgba(224,247,250,0.4)',
                                background: selections[action.id] === lvl ? `${INTENSITY_COLORS[lvl]}15` : 'transparent',
                              }}>
                              {INTENSITY_LABELS[lvl]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {Object.keys(selections).length > 0 ? (
            <>
              <div className="cs-bundle-preview">
                <div className="cs-bundle-title">Active bundle ({Object.keys(selections).length} interventions)</div>
                <div className="cs-bundle-chips">
                  {Object.entries(selections).map(([id, intensity]) => {
                    const action = allActions.find(a => a.id === id)
                    return (
                      <span key={id} className="cs-bundle-chip" style={{ borderColor: `${INTENSITY_COLORS[intensity]}44`, background: `${INTENSITY_COLORS[intensity]}15` }}>
                        {action?.icon} {action?.label} <span style={{ color: INTENSITY_COLORS[intensity], fontSize: '0.62rem' }}>· {intensity}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
              <button type="button" onClick={runPolicy} disabled={loading} className="cs-run-btn">
                {loading ? 'Simulating…' : '▶ Simulate Policy Bundle'}
              </button>
            </>
          ) : (
            <div className="cs-info">Select at least one intervention above.</div>
          )}
        </motion.div>
      )}

      {/* ── SLIDERS ── */}
      {mode === 'sliders' && (
        <motion.div className="cs-panel" {...fadeUp(0.08)}>
          <div className="cs-panel-desc">Adjust feature deltas directly</div>
          <div className="cs-panel-caption">Positive = improvement · Negative = worsening</div>
          {Object.entries(SLIDER_GROUPS).map(([group, features]) => (
            <div key={group} className="cs-slider-group">
              <div className="cs-policy-cat">{group}</div>
              <div className="cs-slider-grid">
                {features.map(f => (
                  <div key={f.key} className="cs-slider-card">
                    <div className="cs-slider-label">{f.label}</div>
                    <input type="range" min={-50} max={50} step={5}
                      value={(sliders[f.key] ?? 0) * 100}
                      onChange={e => setSliders(prev => ({ ...prev, [f.key]: Number(e.target.value) / 100 }))}
                      className="cs-slider" />
                    <div className="cs-slider-val" style={{ color: (sliders[f.key] ?? 0) > 0 ? '#34A853' : (sliders[f.key] ?? 0) < 0 ? '#DC2626' : 'rgba(224,247,250,0.35)' }}>
                      {((sliders[f.key] ?? 0) * 100) > 0 ? '+' : ''}{((sliders[f.key] ?? 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="cs-btn-row">
            <button type="button" onClick={runSliders} disabled={loading} className="cs-run-btn">{loading ? 'Simulating…' : '▶ Run'}</button>
            <button type="button" onClick={() => setSliders({})} className="cs-reset-btn">↺ Reset</button>
          </div>
        </motion.div>
      )}

      {/* ── NATURAL LANGUAGE ── */}
      {mode === 'nl' && (
        <motion.div className="cs-panel" {...fadeUp(0.08)}>
          <div className="cs-panel-desc">Describe your scenario in plain text</div>
          <div className="cs-panel-caption">English · Percentages detected automatically</div>
          <div className="cs-nl-examples">
            <span className="cs-nl-examples-label">💡 Try an example:</span>
            {NL_EXAMPLES.map((ex, i) => (
              <button key={i} type="button" className="cs-nl-example-btn" onClick={() => setNlText(ex)}>{ex.slice(0, 48)}…</button>
            ))}
          </div>
          <textarea value={nlText} onChange={e => setNlText(e.target.value)}
            placeholder="e.g. Reduce CO2 by 25% and improve governance by 30%"
            rows={4} className="cs-textarea" />
          <button type="button" onClick={runNL} disabled={loading} className="cs-run-btn">{loading ? 'Simulating…' : '▶ Simulate'}</button>
        </motion.div>
      )}

      {/* ── COMPOSER ── */}
      {mode === 'composer' && (
        <motion.div className="cs-panel" {...fadeUp(0.08)}>
          <div className="cs-panel-desc">Combine multiple policy shocks into one simulation</div>
          <div className="cs-composer-add">
            <select value={compAction} onChange={e => setCompAction(e.target.value)} className="cs-select">
              <option value="">Select policy action…</option>
              {allActions.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
            </select>
            <div className="cs-intensity-row">
              {INTENSITY_LEVELS.map(lvl => (
                <button key={lvl} type="button" className="cs-intensity-btn"
                  onClick={() => setCompIntensity(lvl as any)}
                  style={{
                    borderColor: compIntensity === lvl ? INTENSITY_COLORS[lvl] : 'rgba(224,247,250,0.1)',
                    color: compIntensity === lvl ? INTENSITY_COLORS[lvl] : 'rgba(224,247,250,0.4)',
                    background: compIntensity === lvl ? `${INTENSITY_COLORS[lvl]}15` : 'transparent',
                  }}>
                  {INTENSITY_LABELS[lvl]}
                </button>
              ))}
            </div>
            <button type="button" className="cs-add-btn"
              onClick={() => {
                if (!compAction) return
                const action = allActions.find(a => a.id === compAction)
                if (!action) return
                const label = `${action.icon} ${action.label} [${compIntensity}]`
                if (!composerItems.find(i => i.label === label))
                  setComposerItems(prev => [...prev, { label, action_id: compAction, intensity: compIntensity }])
              }}>➕ Add</button>
          </div>
          {composerItems.length === 0
            ? <div className="cs-info">Add at least one shock above.</div>
            : <>
                <div className="cs-composer-list">
                  {composerItems.map((item, i) => (
                    <div key={i} className="cs-composer-item">
                      <span className="cs-composer-item-label">{item.label}</span>
                      <button type="button" className="cs-composer-remove"
                        onClick={() => setComposerItems(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="cs-btn-row">
                  <button type="button" onClick={runComposer} disabled={loading} className="cs-run-btn">
                    {loading ? 'Simulating…' : `▶ Run Composed (${composerItems.length} shocks)`}
                  </button>
                  <button type="button" onClick={() => setComposerItems([])} className="cs-reset-btn">🗑️ Clear All</button>
                </div>
              </>
          }
        </motion.div>
      )}

      {result && <motion.div {...fadeUp(0.1)}><ResultCard result={result} /></motion.div>}
    </div>
  )
}
