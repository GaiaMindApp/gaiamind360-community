/**
 * OAuthCallback — processa o redirect do backend após login social.
 * URL: /oauth/callback?access_token=...&role=...&name=...&user_id=...&state=...
 */
import { useEffect, useState } from 'react'
import { secureSetAuth } from '../services/secureStorage'

const OAUTH_STATE_KEY = 'oauth_state'

export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token') || ''
    const role          = params.get('role') || 'user'
    const name          = params.get('name') || ''
    const user_id       = params.get('user_id') || ''
    const email         = params.get('email') || ''
    const state         = params.get('state')

    const savedState = sessionStorage.getItem(OAUTH_STATE_KEY)
    sessionStorage.removeItem(OAUTH_STATE_KEY)

    if (!access_token) {
      setStatus('error')
      setMsg('Token não recebido. Tenta novamente.')
      return
    }

    if (!state || state !== savedState) {
      setStatus('error')
      setMsg('Validação de segurança falhou. Tenta novamente.')
      return
    }

    const user = {
      id: user_id,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    }

    // Usar secureSetAuth — guarda com HMAC integrity check (igual ao login normal)
    secureSetAuth({ user, token: access_token, refresh_token, role })
      .then(() => {
        setStatus('ok')
        setTimeout(() => window.location.replace('/'), 500)
      })
      .catch(() => {
        setStatus('error')
        setMsg('Erro ao guardar sessão. Tenta novamente.')
      })
  }, [])

  const C = { bg: '#071318', accent: '#00FF85', text: '#E0E0E0', muted: '#8AA4AF' }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg, flexDirection: 'column', gap: '1rem',
    }}>
      {status === 'loading' && (
        <>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>A autenticar…</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <span style={{ fontSize: '2.5rem' }}>✅</span>
          <p style={{ color: C.accent, fontWeight: 700 }}>Login efectuado! A redirecionar…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <span style={{ fontSize: '2.5rem' }}>❌</span>
          <p style={{ color: '#f87171' }}>{msg}</p>
          <button onClick={() => window.location.href = '/'} style={{
            padding: '10px 24px', background: C.accent, color: C.bg,
            border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 700,
          }}>Voltar</button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
