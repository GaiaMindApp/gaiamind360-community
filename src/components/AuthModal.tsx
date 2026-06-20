import { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, Loader2, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { checkPasswordStrength } from '../utils/passwordStrength';
import './AuthModal.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

type Mode = 'login' | 'login-otp' | 'register' | 'register-otp' | 'reset-request' | 'reset-otp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (email: string, password: string) => boolean;
  onRegister?: (email: string, password: string, name: string) => boolean;
}

const C = {
  accent:    '#00FF85',
  bg:        '#071318',
  card:      '#0B1D26',
  border:    '#133440',
  text:      '#E0E0E0',
  muted:     '#8AA4AF',
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, verifyLoginOTP, requestOTP, verifyOTP, requestPasswordReset, verifyPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const passwordStrength = (mode === 'register' || mode === 'reset-otp') && password ? checkPasswordStrength(password) : null;

  const reset = () => { setEmail(''); setPassword(''); setName(''); setOtp(''); setError(''); setSuccess(''); };
  const go = (m: Mode) => { setMode(m); setError(''); setSuccess(''); };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password); go('login-otp');
      } else if (mode === 'login-otp') {
        await verifyLoginOTP(email, otp); reset(); onClose();
      } else if (mode === 'register') {
        await requestOTP(email, name); go('register-otp');
      } else if (mode === 'register-otp') {
        await verifyOTP(email, name, password, otp); reset(); onClose();
      } else if (mode === 'reset-request') {
        await requestPasswordReset(email); go('reset-otp');
      } else if (mode === 'reset-otp') {
        await verifyPasswordReset(email, otp, password);
        setSuccess('Password alterada!'); go('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const titles: Record<Mode, string> = {
    login: 'Entrar', 'login-otp': 'Verificar Identidade',
    register: 'Criar Conta',
    'register-otp': 'Verificar Email',
    'reset-request': 'Recuperar Password',
    'reset-otp': 'Definir nova password',
  };

  return (
    <div className="auth-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="auth-modal-card">
        <h2 className="auth-modal-title">{titles[mode]}</h2>
        {(mode === 'reset-request' || mode === 'reset-otp') && (
          <p className="auth-modal-subtitle">
            {mode === 'reset-request'
              ? 'Insira o seu email corporativo para receber um código seguro de recuperação.'
              : 'Digite o código recebido e defina uma nova password segura para a sua conta.'
            }
          </p>
        )}

        <form onSubmit={handle} className="auth-modal-form">

          {mode === 'register' && (
            <Field icon={<User size={16} />} placeholder="Nome completo" value={name} onChange={setName} type="text" />
          )}

          {mode !== 'register-otp' && mode !== 'reset-otp' && (
            <Field icon={<Mail size={16} />} placeholder="Email" value={email} onChange={setEmail} type="email" autoComplete={mode === 'login' ? 'username' : 'email'} focused={mode === 'login'} />
          )}

          {(mode === 'login' || mode === 'register') && (<>
            <Field icon={<Lock size={16} />} placeholder="Password" value={password} onChange={setPassword} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && password && passwordStrength && (
              <div className="password-strength-indicator">
                <div className="strength-bar-container">
                  <div className="strength-bar" data-strength={passwordStrength.score} />
                </div>
                <span className="strength-text" data-valid={passwordStrength.valid}>
                  <Shield size={12} /> {passwordStrength.feedback}
                </span>
              </div>
            )}
          </>)}

          {(mode === 'register-otp' || mode === 'reset-otp' || mode === 'login-otp') && (<>
            <p className="auth-modal-help">
              {mode === 'login-otp'
                ? <>Código de verificação enviado para <strong style={{ color: '#00ff85' }}>{email}</strong>. Confirma a tua identidade.</>
                : <>Código enviado para <strong style={{ color: '#00ff85' }}>{email}</strong>.</>
              }
            </p>
            <Field icon={<KeyRound size={16} />} placeholder="Código de 6 dígitos" value={otp} onChange={setOtp} type="text" maxLength={6} center />
            {mode === 'reset-otp' && (<>
              <Field icon={<Lock size={16} />} placeholder="Nova password" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
              {password && passwordStrength && (
                <div className="password-strength-indicator">
                  <div className="strength-bar-container">
                    <div className="strength-bar" data-strength={passwordStrength.score} />
                  </div>
                  <span className="strength-text" data-valid={passwordStrength.valid}>
                    <Shield size={12} /> {passwordStrength.feedback}
                  </span>
                </div>
              )}
            </>)}
          </>)}

          {error && <p className="auth-modal-message error">{error}</p>}
          {success && <p className="auth-modal-message success">{success}</p>}

          <button type="submit" disabled={loading || (passwordStrength && !passwordStrength.valid)} className="auth-modal-button">
            {loading ? <Loader2 size={18} className="animate-spin" /> : titles[mode]}
          </button>

          <div className="auth-modal-link">
            {mode === 'login' && (<>
              <p className="auth-modal-help">
                Não tens conta?{' '}
                <button type="button" onClick={() => go('register')}>Regista-te</button>
              </p>
              <button type="button" onClick={() => go('reset-request')} className="auth-modal-secondary">
                Esqueceste a password?
              </button>
            </>)}
            {(mode === 'register' || mode === 'reset-request' || mode === 'register-otp' || mode === 'login-otp') && (
              <button type="button" onClick={() => go('login')} className="auth-modal-secondary">
                <ArrowLeft size={14} /> Voltar ao login
              </button>
            )}
          </div>
        </form>

        {/* ── OAuth Social Login — só no ecrã de login/registo ── */}
        {(mode === 'login' || mode === 'register') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 10px' }}>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
              <span style={{ color: C.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>ou continuar com</span>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <OAuthButton
                onClick={() => {
                  const state = crypto.randomUUID()
                  sessionStorage.setItem('oauth_state', state)
                  window.location.href = `${API_BASE}/api/auth/google?state=${state}`
                }}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }
                label="Google"
              />
              <OAuthButton
                onClick={() => {
                  const state = crypto.randomUUID()
                  sessionStorage.setItem('oauth_state', state)
                  window.location.href = `${API_BASE}/api/auth/github?state=${state}`
                }}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                }
                label="GitHub"
                dark
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OAuthButton({ onClick, icon, label, dark }: {
  onClick: () => void; icon: React.ReactNode; label: string; dark?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: 'clamp(0.5rem, 2vw, 0.6875rem) clamp(0.5rem, 2vw, 0.875rem)',
        fontSize: '0.8125rem',
        background: hover
          ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)')
          : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)'),
        border: `1px solid ${hover ? 'rgba(255,255,255,0.25)' : '#133440'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        color: '#E0E0E0',
        fontSize: '14px',
        fontWeight: 600,
        transition: 'all 0.18s',
        letterSpacing: '0.01em',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Field({ icon, placeholder, value, onChange, type = 'text', autoComplete, focused, maxLength, center }: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; autoComplete?: string;
  focused?: boolean; maxLength?: number; center?: boolean;
}) {
  const [active, setActive] = useState(false);
  return (
    <div className={`auth-modal-field${active ? ' active' : ''}`}>
      <span className="auth-modal-field-icon">{icon}</span>
      <input
        className="auth-modal-input"
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setActive(true)} onBlur={() => setActive(false)}
        autoComplete={autoComplete || 'off'}
        autoFocus={focused}
        maxLength={maxLength}
        required
        style={{ textAlign: center ? 'center' : 'left', letterSpacing: center ? '6px' : 'normal' }}
      />
    </div>
  );
}
