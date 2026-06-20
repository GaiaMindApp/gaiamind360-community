import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Detect light mode at render time
const isLight = () =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('light')

// Theme-aware colour palette
const getC = () => {
  const light = isLight()
  return {
    bg:         light ? '#F8F9FA'                  : 'rgba(0,48,73,0.4)',
    bgCard:     light ? '#FFFFFF'                  : 'rgba(0,48,73,0.6)',
    bgDeep:     light ? '#F1F5F9'                  : 'rgba(0,30,50,0.7)',
    border:     light ? '#E2E8F0'                  : 'rgba(0,230,118,0.2)',
    borderErr:  light ? '#FECACA'                  : 'rgba(248,113,113,0.4)',
    borderWarn: light ? '#FCD34D'                  : 'rgba(255,209,102,0.35)',
    borderBlue: light ? '#BAE6FD'                  : 'rgba(147,197,253,0.35)',
    green:      light ? '#057A55'                  : '#00E676',
    greenFaint: light ? 'rgba(5,122,85,0.08)'      : 'rgba(0,230,118,0.12)',
    text:       light ? '#0F172A'                  : 'rgba(224,247,250,0.9)',
    textMid:    light ? '#475569'                  : 'rgba(224,247,250,0.6)',
    textDim:    light ? '#94A3B8'                  : 'rgba(224,247,250,0.4)',
    red:        light ? '#DC2626'                  : '#f87171',
    redBg:      light ? '#FEF2F2'                  : 'rgba(127,29,29,0.5)',
    yellow:     light ? '#D97706'                  : '#FFD166',
    yellowBg:   light ? 'rgba(217,119,6,0.08)'     : 'rgba(120,53,15,0.5)',
    blue:       light ? '#0284C7'                  : '#93c5fd',
    blueBg:     light ? '#F0F8FF'                  : 'rgba(30,58,95,0.6)',
  }
}

// Severity map — computed per render so colours are always theme-correct
const getSEV = (C: ReturnType<typeof getC>) => ({
  success: { icon: '✅', color: C.green,  border: C.border,     bg: C.greenFaint },
  error:   { icon: '❌', color: C.red,    border: C.borderErr,  bg: C.redBg      },
  warning: { icon: '⚠️', color: C.yellow, border: C.borderWarn, bg: C.yellowBg   },
  info:    { icon: 'ℹ️', color: C.blue,   border: C.borderBlue, bg: C.blueBg     },
})

interface Notification {
  id: number; type: string; title: string; message: string
  created_at: string; read: boolean; severity: string
}
interface EmailCfg {
  email_enabled: boolean; email_to: string; smtp_configured: boolean
  email_verified: boolean; pending_verification: boolean
}

export function NotificationsTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  // Recompute colours on every render so theme switches apply immediately
  const C = getC()
  const SEV = getSEV(C)

  // Notification state
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Email config state
  const [emailCfg, setEmailCfg] = useState<EmailCfg>({
    email_enabled: false, email_to: '', smtp_configured: false,
    email_verified: false, pending_verification: false,
  })
  const [emailInput, setEmailInput] = useState('')
  const emailInitRef = useRef(false)

  // OTP state
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpMsg, setOtpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [sendingOtp, setSendingOtp] = useState(false)

  const getHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' })

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/test-runner/notifications`, { headers: getHeaders() })
      if (res.ok) setNotifs(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEmailCfg = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/test-runner/notifications/email-config`, { headers: getHeaders() })
      if (res.ok) {
        const cfg = await res.json()
        setEmailCfg(cfg)
        if (!emailInitRef.current) { setEmailInput(cfg.email_to || ''); emailInitRef.current = true }
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchNotifs(); fetchEmailCfg()
    const i = setInterval(fetchNotifs, 15000)
    return () => clearInterval(i)
  }, [fetchNotifs, fetchEmailCfg])

  const markRead = async (id?: number) => {
    await fetch(`${API}/api/test-runner/notifications/read${id ? `?notification_id=${id}` : ''}`, { method: 'POST', headers: getHeaders() })
    fetchNotifs()
  }

  const clearAll = async () => {
    await fetch(`${API}/api/test-runner/notifications/clear`, { method: 'POST', headers: getHeaders() })
    fetchNotifs()
  }

  const requestOtp = async () => {
    if (!emailInput) return
    setSendingOtp(true); setOtpMsg(null)
    try {
      await fetch(`${API}/api/test-runner/notifications/email-config`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ email_to: emailInput }),
      })
      const r = await fetch(`${API}/api/test-runner/notifications/email-verify/request`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ email_to: emailInput }),
      })
      const d = await r.json()
      if (d.already_verified) {
        setOtpMsg({ ok: true, text: 'Email already verified.' }); fetchEmailCfg()
      } else if (d.ok) {
        setOtpSent(true); setOtpMsg({ ok: true, text: d.message })
      } else {
        setOtpMsg({ ok: false, text: d.error || 'Failed to send code.' })
      }
    } catch { setOtpMsg({ ok: false, text: 'Network error.' }) }
    finally { setSendingOtp(false) }
  }

  const confirmOtp = async () => {
    if (!otpInput) return
    setSendingOtp(true); setOtpMsg(null)
    try {
      const r = await fetch(`${API}/api/test-runner/notifications/email-verify/confirm`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ email_to: emailInput, code: otpInput }),
      })
      const d = await r.json()
      if (d.ok) {
        setOtpSent(false); setOtpInput('')
        setOtpMsg({ ok: true, text: d.message })
        emailInitRef.current = false; fetchEmailCfg()
      } else {
        setOtpMsg({ ok: false, text: d.error })
      }
    } catch { setOtpMsg({ ok: false, text: 'Network error.' }) }
    finally { setSendingOtp(false) }
  }

  const toggleEnabled = async (val: boolean) => {
    await fetch(`${API}/api/test-runner/notifications/email-config`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ email_enabled: val }),
    })
    emailInitRef.current = false; fetchEmailCfg()
  }

  if (loading) return (
    <div style={{ padding: '1.25rem', color: C.textMid, fontSize: 'clamp(0.75rem,2vw,0.875rem)' }}>
      ⏳ {t('monitor.loading')}
    </div>
  )

  const unread = notifs.filter(n => !n.read).length
  const isVerifiedCurrent = emailCfg.email_verified && emailInput === emailCfg.email_to

  return (
    <div>
      <p style={{ fontSize: 'clamp(0.7rem,2vw,0.8rem)', color: C.textMid, lineHeight: 1.6, marginBottom: '1rem' }}>
        {t('monitor.notif_desc')}
      </p>

      {/* Email config */}
      <div style={{ padding: 'clamp(0.625rem,2vw,0.875rem)', borderRadius: '0.75rem', background: C.bgDeep, border: `1px solid ${C.border}`, marginBottom: '1rem' }}>
        <div style={{ fontSize: 'clamp(0.75rem,2vw,0.875rem)', color: C.text, fontWeight: 600, marginBottom: '0.5rem' }}>
          {t('monitor.email_title')}
        </div>
        <p style={{ fontSize: 'clamp(0.65rem,1.8vw,0.75rem)', color: C.textMid, margin: '0 0 0.625rem', lineHeight: 1.5 }}>
          {t('monitor.email_desc')}
        </p>

        {!emailCfg.smtp_configured && (
          <div style={{ padding: '0.375rem 0.625rem', background: C.yellowBg, borderRadius: '0.375rem', marginBottom: '0.625rem', fontSize: 'clamp(0.65rem,1.8vw,0.7rem)', color: C.yellow, border: `1px solid ${C.borderWarn}` }}>
            {t('monitor.smtp_warning')}
          </div>
        )}

        {/* Email input + verify button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <input
            type="email" placeholder={t('monitor.email_placeholder')} value={emailInput}
            onChange={e => { setEmailInput(e.target.value); setOtpSent(false); setOtpMsg(null) }}
            style={{ flex: 1, minWidth: 'clamp(160px,30vw,200px)', padding: '6px 10px', borderRadius: '0.375rem', background: C.bgCard, border: `1px solid ${isVerifiedCurrent ? C.green : C.border}`, color: C.text, fontSize: 'clamp(0.7rem,2vw,0.8rem)', minHeight: 40 }}
          />
          {isVerifiedCurrent ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.75rem', borderRadius: 999, background: C.greenFaint, border: `1px solid ${C.green}`, color: C.green, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', fontWeight: 600 }}>
              <span>✓ {t('monitor.verified')}</span>
            </span>
          ) : (
            <button onClick={requestOtp} disabled={sendingOtp || !emailInput}
              style={{ padding: '6px 14px', borderRadius: '0.375rem', background: emailInput ? C.greenFaint : C.bg, border: `1px solid ${emailInput ? C.green : C.border}`, color: emailInput ? C.green : C.textDim, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', cursor: emailInput && !sendingOtp ? 'pointer' : 'default', minHeight: 40, fontWeight: 600, transition: 'all 0.15s' }}>
              <span>{sendingOtp ? '...' : t('monitor.send_code')}</span>
            </button>
          )}
        </div>

        {/* OTP input */}
        {otpSent && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              type="text" placeholder={t('monitor.otp_placeholder')} value={otpInput} maxLength={6}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              style={{ width: 130, padding: '6px 10px', borderRadius: '0.375rem', background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 'clamp(0.85rem,2vw,1rem)', minHeight: 40, letterSpacing: '0.25em', textAlign: 'center', fontWeight: 700 }}
            />
            <button onClick={confirmOtp} disabled={sendingOtp || otpInput.length !== 6}
              style={{ padding: '6px 14px', borderRadius: '0.375rem', background: otpInput.length === 6 ? C.greenFaint : C.bg, border: `1px solid ${otpInput.length === 6 ? C.green : C.border}`, color: otpInput.length === 6 ? C.green : C.textDim, fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', cursor: otpInput.length === 6 && !sendingOtp ? 'pointer' : 'default', minHeight: 40, fontWeight: 600 }}>
              <span>{sendingOtp ? '...' : t('monitor.otp_confirm')}</span>
            </button>
          </div>
        )}

        {/* OTP feedback */}
        {otpMsg && (
          <div style={{ fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', color: otpMsg.ok ? C.green : C.red, marginBottom: '0.5rem', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', background: otpMsg.ok ? C.greenFaint : C.redBg, border: `1px solid ${otpMsg.ok ? C.border : C.borderErr}` }}>
            {otpMsg.text}
          </div>
        )}

        {/* Enable toggle — only available if verified */}
        {isVerifiedCurrent && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', color: C.textMid, marginTop: '0.25rem' }}>
            <input type="checkbox" checked={emailCfg.email_enabled}
              onChange={e => toggleEnabled(e.target.checked)} />
            {t('monitor.enable_emails')}
            {emailCfg.email_enabled && (
              <span style={{ color: C.green, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 4px ${C.green}` }} />
                <span>{t('monitor.active')}</span>
              </span>
            )}
          </label>
        )}
      </div>

      {/* Notifications list header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 'clamp(0.75rem,2vw,0.875rem)', color: C.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('monitor.notifications_title')}
          {unread > 0 && (
            <span style={{ padding: '1px 8px', borderRadius: 999, background: C.red, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>
              {unread} {t('monitor.new')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {unread > 0 && (
            <button onClick={() => markRead()} style={{ padding: '4px 10px', borderRadius: '0.375rem', background: C.greenFaint, border: `1px solid ${C.border}`, color: C.green, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', cursor: 'pointer', minHeight: 32 }}>
              {t('monitor.mark_all_read')}
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll} style={{ padding: '4px 10px', borderRadius: '0.375rem', background: C.bg, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 'clamp(0.65rem,1.5vw,0.7rem)', cursor: 'pointer', minHeight: 32 }}>
              {t('monitor.clear')}
            </button>
          )}
        </div>
      </div>

      {notifs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: C.textDim, fontSize: 'clamp(0.7rem,2vw,0.8rem)', background: C.bgDeep, borderRadius: '0.75rem', border: `1px solid ${C.border}` }}>
          {t('monitor.no_notifications')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifs.map(n => {
            const sev = SEV[n.severity] || SEV.info
            return (
              <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                style={{
                  padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.625rem,2vw,0.875rem)',
                  borderRadius: '0.5rem',
                  cursor: n.read ? 'default' : 'pointer',
                  background: n.read ? C.bg : sev.bg,
                  borderTop: `1px solid ${n.read ? C.border : sev.border}`,
                  borderRight: `1px solid ${n.read ? C.border : sev.border}`,
                  borderBottom: `1px solid ${n.read ? C.border : sev.border}`,
                  borderLeft: `3px solid ${sev.color}`,
                  opacity: n.read ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 'clamp(0.75rem,2vw,0.875rem)', color: sev.color, fontWeight: 600 }}>{sev.icon} {n.title}</span>
                  <span style={{ fontSize: 'clamp(0.6rem,1.5vw,0.65rem)', color: C.textDim }}>
                    {new Date(n.created_at + 'Z').toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(0.7rem,1.8vw,0.75rem)', color: C.textMid, marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {n.message}
                </div>
                {!n.read && (
                  <div style={{ fontSize: 'clamp(0.6rem,1.5vw,0.65rem)', color: C.textDim, marginTop: 4 }}>
                    {t('monitor.click_to_read')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
