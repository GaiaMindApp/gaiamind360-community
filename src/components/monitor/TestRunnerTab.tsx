import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Design tokens — theme-aware ───────────────────────────────────────────────
const isLight = () =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('light')

const getT = () => {
  const l = isLight()
  return {
    bg:          l ? '#F8F9FA'                 : 'rgba(0,48,73,0.35)',
    bgCard:      l ? '#FFFFFF'                 : 'rgba(0,48,73,0.55)',
    bgDeep:      l ? '#F1F5F9'                 : 'rgba(0,22,40,0.75)',
    bgGlass:     l ? '#FFFFFF'                 : 'rgba(0,48,73,0.25)',
    border:      l ? '#E2E8F0'                 : 'rgba(0,230,118,0.18)',
    borderMid:   l ? '#CBD5E1'                 : 'rgba(0,230,118,0.30)',
    borderErr:   l ? '#FECACA'                 : 'rgba(248,113,113,0.40)',
    borderWarn:  l ? '#FCD34D'                 : 'rgba(255,209,102,0.35)',
    borderBlue:  l ? '#BAE6FD'                 : 'rgba(147,197,253,0.30)',
    green:       l ? '#057A55'                 : '#00E676',
    greenDim:    l ? '#0E9F6E'                 : 'rgba(0,230,118,0.70)',
    greenFaint:  l ? 'rgba(5,122,85,0.08)'     : 'rgba(0,230,118,0.10)',
    greenFaint2: l ? 'rgba(5,122,85,0.05)'     : 'rgba(0,230,118,0.06)',
    text:        l ? '#0F172A'                 : 'rgba(224,247,250,0.92)',
    textMid:     l ? '#475569'                 : 'rgba(224,247,250,0.60)',
    textDim:     l ? '#94A3B8'                 : 'rgba(224,247,250,0.35)',
    red:         l ? '#DC2626'                 : '#f87171',
    redFaint:    l ? '#FEF2F2'                 : 'rgba(248,113,113,0.10)',
    redBg:       l ? '#FEF2F2'                 : 'rgba(127,29,29,0.45)',
    yellow:      l ? '#D97706'                 : '#FFD166',
    yellowFaint: l ? 'rgba(217,119,6,0.08)'    : 'rgba(255,209,102,0.10)',
    blue:        l ? '#0284C7'                 : '#93c5fd',
    blueFaint:   l ? '#F0F8FF'                 : 'rgba(147,197,253,0.10)',
    blueBg:      l ? '#F0F8FF'                 : 'rgba(30,58,95,0.55)',
    radius:      '10px',
    radiusSm:    '6px',
  }
}

// ── Preset schedule options ───────────────────────────────────────────────────
const PRESETS = [
  { label: 'Midnight',    value: '00:00', icon: '🌙' },
  { label: '3 AM',        value: '03:00', icon: '🌃' },
  { label: '6 AM',        value: '06:00', icon: '🌅' },
  { label: 'Noon',        value: '12:00', icon: '☀️' },
  { label: '6 PM',        value: '18:00', icon: '🌆' },
  { label: '11 PM',       value: '23:00', icon: '🌛' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface TestItem  { name: string; status: string; error_message?: string }
interface RunRecord {
  run_id: number; trigger: string; started_at: string; finished_at: string
  duration_s: number; status: string; total: number; passed: number
  failed: number; errors: number; skipped: number; tests: TestItem[]
}
interface RunnerState {
  status: string; enabled: boolean; schedule_times: string[]
  next_run_at: string | null; total_runs: number
  current_run: RunRecord | null; history: RunRecord[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDur(s: number) {
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60); const sec = (s % 60).toFixed(0)
  return `${m}m ${sec}s`
}
function fmtTime(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'Z').toLocaleString('en-GB', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    })
  } catch { return iso }
}
function fmtNextRun(iso: string | null) {
  if (!iso) return '—'
  try {
    const d = new Date(iso + 'Z')
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffH = Math.floor(diffMs / 3600000)
    const diffM = Math.floor((diffMs % 3600000) / 60000)
    const timeStr = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    if (diffMs < 0) return timeStr
    if (diffH === 0) return `in ${diffM}m · ${timeStr}`
    return `in ${diffH}h ${diffM}m · ${timeStr}`
  } catch { return iso }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function TestBar({ p, f, e, sk, total }: { p: number; f: number; e: number; sk: number; total: number }) {
  const T = getT()
  if (total === 0) return null
  const w = (n: number) => `${(n / total * 100).toFixed(1)}%`
  const skColor = isLight() ? '#CBD5E1' : 'rgba(224,247,250,0.2)'
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: isLight() ? '#E2E8F0' : 'rgba(0,0,0,0.3)', gap: 1 }}>
      {p  > 0 && <div style={{ width: w(p),  background: T.green,  borderRadius: 999 }} />}
      {f  > 0 && <div style={{ width: w(f),  background: T.red,    borderRadius: 999 }} />}
      {e  > 0 && <div style={{ width: w(e),  background: T.yellow, borderRadius: 999 }} />}
      {sk > 0 && <div style={{ width: w(sk), background: skColor,  borderRadius: 999 }} />}
    </div>
  )
}

// ── Run card ──────────────────────────────────────────────────────────────────
function RunCard({ run, defaultOpen = false }: { run: RunRecord; defaultOpen?: boolean }) {
  const { t } = useTranslation()
  const T = getT()
  const [open, setOpen] = useState(defaultOpen)
  const [filter, setFilter] = useState('all')
  const filtered = run.tests.filter(ti => filter === 'all' || ti.status === filter)
  const grouped: Record<string, TestItem[]> = {}
  filtered.forEach(ti => { const f = ti.name.split('::')[0] || '?'; (grouped[f] ??= []).push(ti) })

  const isPassed  = run.status === 'passed'
  const isRunning = run.status === 'running'
  const accent       = isPassed ? T.green     : isRunning ? T.blue     : T.red
  const accentFaint  = isPassed ? T.greenFaint : isRunning ? T.blueFaint : T.redFaint
  const accentBorder = isPassed ? T.borderMid  : isRunning ? T.borderBlue : T.borderErr

  const passRate = run.total > 0 ? Math.round(run.passed / run.total * 100) : 0

  return (
    <div style={{ borderRadius: T.radius, border: `1px solid ${accentBorder}`, background: T.bgDeep, overflow: 'hidden', marginBottom: '0.5rem' }}>
      {/* Header row */}
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '0.625rem 0.875rem', cursor: 'pointer',
        background: accentFaint,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 6,
        borderBottom: open ? `1px solid ${accentBorder}` : 'none',
        transition: 'background 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem' }}>{isRunning ? '⏳' : isPassed ? '✅' : '❌'}</span>
          <div>
            <span style={{ fontWeight: 700, color: accent, fontSize: '0.875rem' }}>Run #{run.run_id}</span>
            <span style={{ fontSize: '0.7rem', color: T.textDim, marginLeft: 8 }}>
              {run.trigger === 'scheduled' ? '🕐 Scheduled' : '▶ Manual'} · {fmtTime(run.started_at)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: T.green, fontWeight: 600 }}>✅ {run.passed}</span>
          {(run.failed + run.errors) > 0 && <span style={{ fontSize: '0.75rem', color: T.red, fontWeight: 600 }}>❌ {run.failed + run.errors}</span>}
          <span style={{ fontSize: '0.7rem', color: T.textDim }}>⏱ {fmtDur(run.duration_s)}</span>
          <span style={{ fontSize: '0.75rem', color: accent, fontWeight: 700 }}>{passRate}%</span>
          <span style={{ color: T.textDim, fontSize: '0.75rem' }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0.75rem 0.875rem' }}>
          <div style={{ marginBottom: '0.625rem' }}>
            <TestBar p={run.passed} f={run.failed} e={run.errors} sk={run.skipped} total={run.total} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.625rem', flexWrap: 'wrap' }}>
            {[
              { l: t('monitor.filter_all'),    v: 'all',    n: run.total,   c: T.text  },
              { l: t('monitor.filter_passed'), v: 'passed', n: run.passed,  c: T.green },
              { l: t('monitor.filter_failed'), v: 'failed', n: run.failed,  c: T.red   },
              { l: t('monitor.filter_errors'), v: 'error',  n: run.errors,  c: T.yellow},
            ].map(b => (
              <button key={b.v} onClick={ev => { ev.stopPropagation(); setFilter(f => f === b.v ? 'all' : b.v) }}
                style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', cursor: 'pointer', minHeight: 28,
                  background: filter === b.v ? T.greenFaint : 'transparent',
                  border: `1px solid ${filter === b.v ? T.green : T.border}`,
                  color: filter === b.v ? T.green : b.c, fontWeight: 600 }}>
                {b.n} {b.l}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {Object.entries(grouped).map(([file, tests]) => (
              <div key={file} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: '0.68rem', color: T.textDim, padding: '3px 0', borderBottom: `1px solid ${T.border}`, marginBottom: 3 }}>
                  📄 {file.replace('tests/', '')} <span style={{ color: T.textDim }}>({tests.length})</span>
                </div>
                {tests.map((ti, i) => (
                  <div key={i} style={{ padding: '3px 8px 3px 12px', fontSize: '0.72rem' }}>
                    <span>{ti.status === 'passed' ? '✅' : ti.status === 'failed' ? '❌' : '💥'} </span>
                    <span style={{ color: ti.status === 'passed' ? T.green : T.red }}>{ti.name.split('::').pop()}</span>
                    {ti.error_message && (
                      <div style={{ marginTop: 2, marginLeft: 16, padding: '3px 6px', background: T.redBg, borderRadius: 4, fontSize: '0.65rem', color: T.red, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto', border: `1px solid ${T.borderErr}` }}>
                        {ti.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Schedule Manager (enterprise) ────────────────────────────────────────────
function ScheduleManager({
  times, enabled, onAdd, onRemove, onToggle,
}: {
  times: string[]; enabled: boolean
  onAdd: (t: string) => void; onRemove: (t: string) => void; onToggle: () => void
}) {
  const T = getT()
  const [customTime, setCustomTime] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')

  const handleAdd = (val: string) => {
    if (!val || times.includes(val)) return
    onAdd(val); setCustomTime('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.text, letterSpacing: '0.01em' }}>
            🗓 Scheduled Runs
          </div>
          <div style={{ fontSize: '0.68rem', color: T.textDim, marginTop: 2 }}>
            All times in UTC · runs daily at configured hours
          </div>
        </div>
        {/* Enabled toggle pill */}
        <button onClick={onToggle} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
          background: enabled ? T.greenFaint : T.redFaint,
          border: `1px solid ${enabled ? T.borderMid : T.borderErr}`,
          color: enabled ? T.green : T.red,
          fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: enabled ? T.green : T.red,
            boxShadow: enabled ? `0 0 6px ${T.green}` : 'none',
            flexShrink: 0,
          }} />
          {enabled ? 'Scheduler ON' : 'Scheduler OFF'}
        </button>
      </div>

      {/* Active schedule chips */}
      <div style={{
        minHeight: 48, padding: '0.625rem 0.75rem',
        background: T.bgDeep, borderRadius: T.radius,
        border: `1px solid ${T.border}`,
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
      }}>
        {times.length === 0 ? (
          <span style={{ fontSize: '0.72rem', color: T.textDim, fontStyle: 'italic' }}>
            No scheduled times — add one below
          </span>
        ) : times.map(time => (
          <div key={time} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 8px 5px 12px', borderRadius: 999,
            background: enabled ? T.greenFaint : 'rgba(224,247,250,0.05)',
            border: `1px solid ${enabled ? T.borderMid : T.border}`,
            color: enabled ? T.green : T.textMid,
            fontSize: '0.78rem', fontWeight: 700,
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>🕐</span>
            {time} UTC
            <button onClick={() => onRemove(time)} title="Remove" style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: T.red, cursor: 'pointer',
              fontSize: '0.7rem', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, transition: 'all 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.redBg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}
            >✕</button>
          </div>
        ))}
      </div>

      {/* Add time — mode switcher */}
      <div style={{ background: T.bgDeep, borderRadius: T.radius, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {(['preset', 'custom'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer',
              background: mode === m ? T.greenFaint2 : 'transparent',
              borderBottom: mode === m ? `2px solid ${T.green}` : '2px solid transparent',
              color: mode === m ? T.green : T.textDim,
              fontSize: '0.72rem', fontWeight: mode === m ? 700 : 400,
              transition: 'all 0.15s',
            }}>
              {m === 'preset' ? '⚡ Quick Presets' : '🕐 Custom Time'}
            </button>
          ))}
        </div>

        <div style={{ padding: '0.75rem' }}>
          {mode === 'preset' ? (
            /* Preset grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
              {PRESETS.map(p => {
                const active = times.includes(p.value)
                return (
                  <button key={p.value}
                    onClick={() => active ? onRemove(p.value) : handleAdd(p.value)}
                    style={{
                      padding: '0.5rem 0.375rem', borderRadius: T.radiusSm,
                      border: `1px solid ${active ? T.borderMid : T.border}`,
                      background: active ? T.greenFaint : T.bgGlass,
                      color: active ? T.green : T.textMid,
                      cursor: 'pointer', fontSize: '0.72rem', fontWeight: active ? 700 : 400,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      transition: 'all 0.15s', minHeight: 52,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = T.borderMid }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = T.border }}
                  >
                    <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                    <span style={{ fontWeight: 700 }}>{p.value}</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{p.label}</span>
                    {active && <span style={{ fontSize: '0.6rem', color: T.green }}>✓ active</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Custom time picker */
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: T.radiusSm, padding: '0 0.75rem',
              }}>
                <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>🕐</span>
                <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: T.text, fontSize: '0.875rem', minHeight: 40,
                    colorScheme: isLight() ? 'light' : 'dark' as any,
                  }}
                />
                <span style={{ fontSize: '0.65rem', color: T.textDim, flexShrink: 0 }}>UTC</span>
              </div>
              <button onClick={() => handleAdd(customTime)} disabled={!customTime || times.includes(customTime)}
                style={{
                  padding: '0 1rem', minHeight: 40, borderRadius: T.radiusSm,
                  background: customTime && !times.includes(customTime) ? T.greenFaint : T.bg,
                  border: `1px solid ${customTime && !times.includes(customTime) ? T.green : T.border}`,
                  color: customTime && !times.includes(customTime) ? T.green : T.textDim,
                  cursor: customTime && !times.includes(customTime) ? 'pointer' : 'default',
                  fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}>
                + Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function TestRunnerTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const T = getT()
  const [state, setState] = useState<RunnerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const hdrs = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' })

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/test-runner/state`, { headers: hdrs() })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setState(await r.json()); setErr(null)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchState()
    const i = setInterval(fetchState, 10000)
    return () => clearInterval(i)
  }, [fetchState])

  const configure = async (times?: string[], enabled?: boolean) => {
    await fetch(`${API}/api/test-runner/configure`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ schedule_times: times, enabled }),
    })
    fetchState()
  }

  const triggerRun = async () => {
    setTriggering(true)
    try {
      await fetch(`${API}/api/test-runner/run`, { method: 'POST', headers: hdrs() })
      setTimeout(fetchState, 1500)
    } catch (e: any) { setErr(e.message) }
    finally { setTriggering(false) }
  }

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: T.textMid, fontSize: '0.875rem' }}>
      ⏳ {t('monitor.loading')}
    </div>
  )

  const s = state
  const isRunning = s?.status === 'running'
  const isPassed  = s?.status === 'passed'
  const isIdle    = s?.status === 'idle'

  const statusMeta = isRunning
    ? { icon: '⏳', label: 'Running tests…', color: T.blue,   bg: T.blueFaint,  border: T.borderBlue }
    : isPassed
    ? { icon: '✅', label: 'All tests passed', color: T.green, bg: T.greenFaint, border: T.borderMid  }
    : isIdle
    ? { icon: '💤', label: 'Idle',             color: T.textMid, bg: T.bgGlass, border: T.border     }
    : { icon: '❌', label: 'Failures detected', color: T.red,  bg: T.redFaint,   border: T.borderErr  }

  const lastRun = s?.current_run
  const passRate = lastRun && lastRun.total > 0
    ? Math.round(lastRun.passed / lastRun.total * 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Description */}
      <p style={{ fontSize: '0.78rem', color: T.textMid, lineHeight: 1.6, margin: 0 }}>
        {t('monitor.tests_desc')}
      </p>

      {err && (
        <div style={{ padding: '0.5rem 0.75rem', background: T.redBg, border: `1px solid ${T.borderErr}`, borderRadius: T.radiusSm, color: T.red, fontSize: '0.75rem' }}>
          ⚠️ {err}
        </div>
      )}

      {s && (
        <>
          {/* ── Top KPI row ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem' }}>
            {/* Status KPI */}
            <div style={{ padding: '0.875rem 1rem', borderRadius: T.radius, background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.62rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: statusMeta.color }}>{statusMeta.icon} {statusMeta.label}</div>
            </div>
            {/* Pass rate KPI */}
            <div style={{ padding: '0.875rem 1rem', borderRadius: T.radius, background: T.bgDeep, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.62rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Pass Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: passRate !== null && passRate >= 95 ? T.green : passRate !== null && passRate >= 80 ? T.yellow : T.red }}>
                {passRate !== null ? `${passRate}%` : '—'}
              </div>
              {lastRun && <div style={{ fontSize: '0.65rem', color: T.textDim }}>{lastRun.passed}/{lastRun.total} tests</div>}
            </div>
            {/* Total runs KPI */}
            <div style={{ padding: '0.875rem 1rem', borderRadius: T.radius, background: T.bgDeep, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.62rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total Runs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text }}>{s.total_runs}</div>
              {lastRun && <div style={{ fontSize: '0.65rem', color: T.textDim }}>Last: {fmtDur(lastRun.duration_s)}</div>}
            </div>
            {/* Next run KPI */}
            <div style={{ padding: '0.875rem 1rem', borderRadius: T.radius, background: T.bgDeep, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.62rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Next Run</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: s.enabled ? T.green : T.textDim }}>
                {s.enabled ? fmtNextRun(s.next_run_at) : 'Scheduler off'}
              </div>
            </div>
          </div>

          {/* ── Run Now button ───────────────────────────────────────────── */}
          <button onClick={triggerRun} disabled={triggering || isRunning}
            style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: T.radius,
              border: `1px solid ${isRunning ? T.border : T.green}`,
              background: isRunning ? T.bg : T.greenFaint,
              color: isRunning ? T.textDim : T.green,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 700, minHeight: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              transition: 'all 0.15s', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { if (!isRunning) e.currentTarget.style.background = 'rgba(0,230,118,0.18)' }}
            onMouseLeave={e => { if (!isRunning) e.currentTarget.style.background = T.greenFaint }}
          >
            <span style={{ fontSize: '1.1rem' }}>{isRunning ? '⏳' : '▶'}</span>
            {isRunning ? 'Tests running…' : t('monitor.run_now')}
          </button>

          {/* ── Schedule manager ─────────────────────────────────────────── */}
          <div style={{ padding: '1rem', borderRadius: T.radius, background: T.bgCard, border: `1px solid ${T.border}` }}>
            <ScheduleManager
              times={s.schedule_times}
              enabled={s.enabled}
              onAdd={time => configure([...s.schedule_times, time])}
              onRemove={time => configure(s.schedule_times.filter(x => x !== time))}
              onToggle={() => configure(undefined, !s.enabled)}
            />
          </div>

          {/* ── Last run ─────────────────────────────────────────────────── */}
          {lastRun && (
            <div>
              <div style={{ fontSize: '0.72rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.5rem' }}>
                Last Execution
              </div>
              <RunCard run={lastRun} defaultOpen={lastRun.status !== 'passed'} />
            </div>
          )}

          {/* ── History ──────────────────────────────────────────────────── */}
          {s.history.length > 1 && (
            <div>
              <div style={{ fontSize: '0.72rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.5rem' }}>
                {t('monitor.history')}
              </div>
              {s.history.slice(1).map(r => <RunCard key={r.run_id} run={r} />)}
            </div>
          )}

          {/* ── How it works ─────────────────────────────────────────────── */}
          <div style={{ padding: '0.75rem 1rem', background: T.bgDeep, borderRadius: T.radius, border: `1px solid ${T.border}`, fontSize: '0.7rem', color: T.textDim, lineHeight: 1.9 }}>
            <div style={{ fontWeight: 700, color: T.textMid, marginBottom: 4, fontSize: '0.72rem' }}>
              ℹ️ {t('monitor.how_it_works')}
            </div>
            {['how_1', 'how_2', 'how_3', 'how_4'].map(k => (
              <div key={k} style={{ paddingLeft: '0.5rem' }}>· {t(`monitor.${k}`)}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
