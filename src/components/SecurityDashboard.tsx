import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useDevice } from '../hooks/useDevice'
import '../styles/components.css'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const C = {
  bg:        'rgba(0,48,73,0.4)',
  bgCard:    'rgba(0,48,73,0.6)',
  bgDeep:    'rgba(0,30,50,0.7)',
  border:    'rgba(0,230,118,0.2)',
  borderErr: 'rgba(248,113,113,0.4)',
  borderWarn:'rgba(255,209,102,0.35)',
  green:     '#00E676',
  greenFaint:'rgba(0,230,118,0.12)',
  text:      'rgba(224,247,250,0.9)',
  textMid:   'rgba(224,247,250,0.6)',
  textDim:   'rgba(224,247,250,0.4)',
  red:       '#f87171',
  redBg:     'rgba(127,29,29,0.5)',
  yellow:    '#FFD166',
  yellowBg:  'rgba(120,53,15,0.5)',
}

interface SecurityData { timestamp: string; sections: Record<string, any> }

function Badge({ status }: { status: string }) {
  const isOk = status === 'ok' || status === 'active'
  const isErr = status === 'error' || status === 'corrupted'
  return (
    <span style={{
      fontSize: 'clamp(0.6rem,1.5vw,0.7rem)', padding: '2px 8px', borderRadius: 999, fontWeight: 600,
      background: isOk ? C.greenFaint : isErr ? C.redBg : C.yellowBg,
      color: isOk ? C.green : isErr ? C.red : C.yellow,
      border: `1px solid ${isOk ? C.border : isErr ? C.borderErr : C.borderWarn}`,
    }}>
      {isOk ? '🟢' : isErr ? '🔴' : '🟡'} {status}
    </span>
  )
}

function Section({ title, icon, children, delay = 0 }: { title: string; icon: string; children: React.ReactNode; delay?: number }) {
  const [open, setOpen] = useState(true)
  return (
    <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }} className="card-base" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: 'clamp(0.625rem,2vw,0.875rem) clamp(0.75rem,2vw,1rem)',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.bgDeep, borderBottom: open ? `1px solid ${C.border}` : 'none',
      }}>
        <span style={{ fontWeight: 600, fontSize: 'clamp(0.8rem,2vw,0.875rem)', color: C.text }}>{icon} {title}</span>
        <span style={{ color: C.textDim, fontSize: '0.75rem' }}>{open ? '▼' : '▶'}</span>
      </div>
      {open && <div style={{ padding: 'clamp(0.625rem,2vw,0.875rem) clamp(0.75rem,2vw,1rem)' }}>{children}</div>}
    </motion.div>
  )
}

function KV({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: `1px solid ${C.border}`, gap: 8 }}>
      <span style={{ color: C.textMid, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', minWidth: 0 }}>{label}</span>
      <span style={{ color: color || C.text, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', fontWeight: 600, flexShrink: 0 }}>{String(value)}</span>
    </div>
  )
}

export function SecurityDashboard() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const { isMobile } = useDevice()
  const [data, setData] = useState<SecurityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupResult, setBackupResult] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) { setError(t('sec_dash.not_auth')); setLoading(false); return }
      const res = await fetch(`${API}/api/system/security-dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json()); setError(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetch_(); const i = setInterval(fetch_, 30000); return () => clearInterval(i) }, [fetch_])

  const doBackup = async () => {
    setBackupLoading(true); setBackupResult(null)
    try {
      const token = getToken()
      const res = await fetch(`${API}/api/system/backup`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const r = await res.json()
      const ok = Object.values(r.results || {}).filter((v: any) => v.status === 'ok').length
      setBackupResult(`✅ ${ok} DBs backed up (${r.timestamp})`)
    } catch (e: any) { setBackupResult(`❌ ${e.message}`) }
    finally { setBackupLoading(false) }
  }

  if (loading && !data) return (
    <div className="component-container security-dashboard-container">
      <div className="component-wrapper section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: C.textMid, fontSize: '0.875rem' }}>⏳ {t('sec_dash.loading')}</p>
        </div>
      </div>
    </div>
  )

  const s = data?.sections || {}
  const dbIssues      = Object.values(s.db_integrity || {}).filter((v: any) => v.status !== 'ok').length
  const anomalyCount  = s.db_anomalies?.total_alerts || 0
  const offenderCount = s.trust_store?.top_offenders?.length || 0
  const injectionCount= s.injection_detection?.recent_blocks || 0
  const totalIssues   = dbIssues + anomalyCount + offenderCount + injectionCount

  const summaryBg     = totalIssues === 0 ? 'rgba(0,78,59,0.5)' : C.yellowBg
  const summaryBorder = totalIssues === 0 ? 'rgba(0,230,118,0.35)' : C.borderWarn
  const summaryColor  = totalIssues === 0 ? C.green : C.yellow

  return (
    <div className="component-container security-dashboard-container">
      <div className="component-wrapper section">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem,4vw,3rem)' }}>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            🔐 {t('sec_dash.title')}
          </h1>
          <p className="text-responsive-md" style={{ color: C.textMid, maxWidth: '42rem', margin: '0 auto' }}>
            {t('sec_dash.subtitle')}
          </p>
        </motion.div>

        {error && (
          <div style={{ padding: '0.625rem 0.875rem', background: C.redBg, border: `1px solid ${C.borderErr}`, borderRadius: '0.5rem', marginBottom: '1rem', color: C.red, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary bar */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="mb-responsive">
          <div style={{ display: 'flex', gap: 'clamp(0.5rem,2vw,0.75rem)', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 'clamp(140px,30vw,200px)', padding: 'clamp(0.75rem,2vw,1rem)', background: summaryBg, border: `1px solid ${summaryBorder}`, borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1rem,3vw,1.375rem)', fontWeight: 700, color: summaryColor }}>
                {totalIssues === 0 ? t('sec_dash.secure') : `🟡 ${totalIssues} ${t('sec_dash.alerts')}`}
              </div>
              <div style={{ fontSize: 'clamp(0.65rem,1.5vw,0.75rem)', color: C.textMid, marginTop: 4 }}>
                {totalIssues === 0 ? t('sec_dash.no_issues') : t('sec_dash.requires_attention')}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 'clamp(0.375rem,1.5vw,0.5rem)', flex: 2 }}>
              {[
                { label: t('sec_dash.db_issues'),  value: dbIssues,       color: dbIssues > 0 ? C.red : C.green },
                { label: t('sec_dash.anomalies'),   value: anomalyCount,   color: anomalyCount > 0 ? C.yellow : C.green },
                { label: t('sec_dash.offenders'),   value: offenderCount,  color: offenderCount > 0 ? C.yellow : C.green },
                { label: t('sec_dash.injections'),  value: injectionCount, color: injectionCount > 0 ? C.red : C.green },
              ].map(m => (
                <div key={m.label} style={{ padding: 'clamp(0.5rem,2vw,0.75rem)', background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.1rem,3vw,1.375rem)', fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 'clamp(0.6rem,1.5vw,0.65rem)', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sections grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(clamp(280px,45%,440px),1fr))', gap: 'clamp(0.5rem,1.5vw,0.75rem)' }}>

          {/* DB Integrity */}
          <Section title={t('sec_dash.db_integrity')} icon="🗄️" delay={0.1}>
            {Object.entries(s.db_integrity || {}).map(([name, info]: [string, any]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.text, fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', fontWeight: 500 }}>{name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.textDim, fontSize: 'clamp(0.6rem,1.5vw,0.7rem)' }}>{info.size_kb} KB · {info.tables?.length || 0} {t('sec_dash.tables')}</span>
                  <Badge status={info.status} />
                </div>
              </div>
            ))}
          </Section>

          {/* Backups */}
          <Section title={t('sec_dash.backups')} icon="💾" delay={0.12}>
            <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={doBackup} disabled={backupLoading} style={{
                padding: '0.375rem 0.875rem', borderRadius: '0.5rem', minHeight: 36,
                border: `1px solid ${C.green}`, background: C.greenFaint, color: C.green,
                cursor: backupLoading ? 'default' : 'pointer', fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', fontWeight: 600,
                opacity: backupLoading ? 0.7 : 1,
              }}>
                {backupLoading ? t('sec_dash.backing_up') : `🔒 ${t('sec_dash.backup_now')}`}
              </button>
              {backupResult && <span style={{ fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', color: backupResult.startsWith('✅') ? C.green : C.red }}>{backupResult}</span>}
            </div>
            {(s.backups?.list || []).length === 0
              ? <div style={{ color: C.textDim, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)' }}>{t('sec_dash.no_backups')}</div>
              : (s.backups?.list || []).slice(0, 5).map((b: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: C.text, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`Backup ${b.id ? b.id.slice(0,8) : '—'}`}</span>
                  <span style={{ color: C.textDim, fontSize: 'clamp(0.6rem,1.5vw,0.65rem)', flexShrink: 0 }}>{b.size_kb ?? '—'} KB · {b.created ? new Date(b.created).toLocaleString() : ''}</span>
                </div>
              ))
            }
          </Section>

          {/* Trust Store */}
          <Section title={t('sec_dash.trust_store')} icon="👤" delay={0.14}>
            <KV label={t('sec_dash.users_tracked')} value={s.trust_store?.total_users_tracked || 0} />
            {(s.trust_store?.top_offenders || []).length === 0
              ? <div style={{ color: C.green, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', marginTop: 8 }}>{t('sec_dash.no_offenders')}</div>
              : (s.trust_store?.top_offenders || []).map((u: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: C.text, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)' }}>User {u.user_id}</span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ color: u.score < 50 ? C.red : C.yellow, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)' }}>{t('sec_dash.trust')}: {u.score}/100</span>
                    <span style={{ color: C.textDim, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)' }}>{u.infractions} {t('sec_dash.infractions')}</span>
                    <span style={{ color: C.red, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)' }}>{u.blocked_count} {t('sec_dash.blocks')}</span>
                  </div>
                </div>
              ))
            }
          </Section>

          {/* DB Anomalies */}
          <Section title={t('sec_dash.db_anomalies')} icon="⚠️" delay={0.16}>
            <KV label={t('sec_dash.total_alerts')} value={anomalyCount} color={anomalyCount > 0 ? C.yellow : C.green} />
            {(s.db_anomalies?.alerts || []).length === 0
              ? <div style={{ color: C.green, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', marginTop: 8 }}>{t('sec_dash.no_anomalies')}</div>
              : (s.db_anomalies?.alerts || []).slice(0, 10).map((a: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: C.yellow, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)' }}>⚠️ {a.type}</span>
                  <span style={{ color: C.textDim, fontSize: 'clamp(0.6rem,1.5vw,0.65rem)', flexShrink: 0 }}>User: {a.user_id}</span>
                </div>
              ))
            }
          </Section>

          {/* Injection Detection */}
          <Section title={t('sec_dash.injection')} icon="🛡️" delay={0.18}>
            <KV label={t('sec_dash.status')} value={s.injection_detection?.status || 'unknown'} color={C.green} />
            <KV label={t('sec_dash.recent_blocks')} value={injectionCount} color={injectionCount > 0 ? C.yellow : C.green} />
          </Section>

          {/* Moderation */}
          <Section title={t('sec_dash.moderation')} icon="🚫" delay={0.2}>
            {s.moderation?.error
              ? <div style={{ color: C.red, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)' }}>Error: {s.moderation.error}</div>
              : <>
                <KV label={t('sec_dash.total_checks')} value={s.moderation?.total_checks || 0} />
                <KV label={t('sec_dash.total_blocks')} value={s.moderation?.total_blocks || 0} color={s.moderation?.total_blocks > 0 ? C.red : C.green} />
                <KV label={t('sec_dash.total_warns')}  value={s.moderation?.total_warns || 0}  color={s.moderation?.total_warns > 0 ? C.yellow : C.green} />
              </>
            }
          </Section>

          {/* Output Filter */}
          <Section title={t('sec_dash.output_filter')} icon="🔒" delay={0.22}>
            <KV label={t('sec_dash.status')}      value={t('sec_dash.active')}          color={C.green} />
            <KV label={t('sec_dash.double_pass')} value={t('sec_dash.double_pass_val')} color={C.green} />
            <div style={{ color: C.textDim, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', marginTop: 8, lineHeight: 1.5 }}>
              {t('sec_dash.output_filter_desc')}
            </div>
          </Section>

          {/* LLM Status */}
          <Section title={t('sec_dash.llm_status')} icon="🧠" delay={0.24}>
            <KV label="Groq"   value={s.llm_status?.groq_available   ? '✅ Active' : '❌ Inactive'} color={s.llm_status?.groq_available   ? C.green : C.red} />
            <KV label="Gemini" value={s.llm_status?.gemini_available ? '✅ Active' : '❌ Inactive'} color={s.llm_status?.gemini_available ? C.green : C.red} />
            <KV label="OpenAI" value={s.llm_status?.openai_available ? '✅ Active' : '❌ Inactive'} color={s.llm_status?.openai_available ? C.green : C.red} />
            <KV label={t('sec_dash.fallback_active')} value={s.llm_status?.fallback_active ? t('sec_dash.fallback_yes') : t('sec_dash.fallback_no')} color={s.llm_status?.fallback_active ? C.yellow : C.green} />
          </Section>

          {/* System Prompt */}
          <Section title={t('sec_dash.system_prompt')} icon="📜" delay={0.26}>
            <KV label={t('sec_dash.status')}         value={t('sec_dash.active')}                                                                    color={C.green} />
            <KV label={t('sec_dash.security_rules')} value={s.system_prompt?.approximate_rules || 39} />
            <KV label={t('sec_dash.prompt_size')}    value={`${Math.round((s.system_prompt?.prompt_length || 0) / 1024 * 10) / 10} KB`} />
          </Section>

          {/* DB Sessions */}
          <Section title={t('sec_dash.db_sessions')} icon="🔌" delay={0.28}>
            <KV label={t('sec_dash.active_sessions')} value={s.db_sessions?.active || 0} />
            <KV label={t('sec_dash.max_sessions')}    value={s.db_sessions?.max || 20} />
          </Section>

          {/* Rate Limiter */}
          <Section title={t('sec_dash.rate_limiter')} icon="⏱️" delay={0.3}>
            <KV label={t('sec_dash.active_users')}   value={s.rate_limiter?.active_users || 0} />
            <KV label={t('sec_dash.toxic_tracked')}  value={s.rate_limiter?.toxic_tracked || 0} color={s.rate_limiter?.toxic_tracked > 0 ? C.yellow : C.green} />
          </Section>

          {/* Audit Log */}
          <Section title={t('sec_dash.audit_log')} icon="📋" delay={0.32}>
            {(s.db_audit?.recent || []).length === 0
              ? <div style={{ color: C.textDim, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)' }}>{t('sec_dash.no_entries')}</div>
              : (s.db_audit?.recent || []).slice(-10).reverse().map((e: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: C.text, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)' }}>{e.operation}</span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ color: C.textMid, fontSize: 'clamp(0.6rem,1.5vw,0.65rem)' }}>{e.table}</span>
                    <span style={{ color: C.textDim, fontSize: 'clamp(0.6rem,1.5vw,0.65rem)' }}>{new Date(e.ts).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            }
          </Section>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '1rem', fontSize: 'clamp(0.6rem,1.5vw,0.7rem)', color: C.textDim, textAlign: 'right' }}>
          {t('sec_dash.last_update')}: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}
        </div>

      </div>
    </div>
  )
}
