import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Palette, MessageSquare, Trash2, Check, AlertCircle, AlertTriangle, X, Edit3, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '../contexts/I18nContext';
import { Privacy } from './Privacy';
import { useAuth } from '../hooks/useAuth';
import { ChatHistoryService } from '../services/chatHistoryService';
import '../styles/components.css';
import '../styles/settings.css';

const AUTH_KEY = 'gaiamind-auth';
const _apiHost = (() => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
})();

const getAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}'); } catch { return {}; } };
const authHeaders = () => {
  const token = getAuth().token;
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
};
const userKey = (key: string) => {
  try { const id = getAuth()?.user?.id || 'guest'; return `${key}:${id}`; } catch { return key; }
};

type Tab = 'profile' | 'appearance' | 'chat' | 'privacy' | 'account';
type Msg = { text: string; ok: boolean } | null;

// ── Shared styles ──────────────────────────────────────────────────────────
// Segue o padrão do report: clamp() em tudo, minHeight 44px nos botões
const S = {
  label: {
    display: 'block',
    color: 'rgba(224,247,250,0.7)',
    fontSize: 'clamp(0.75rem,2vw,0.85rem)',
    marginBottom: '0.4rem',
    fontWeight: 500,
  } as React.CSSProperties,
  // Equivalente a .input-responsive com tema escuro
  input: {
    width: '100%',
    padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.625rem,2vw,0.875rem)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(0,230,118,0.25)',
    background: 'rgba(0,48,73,0.5)',
    color: '#e0f7fa',
    fontSize: 'clamp(0.8rem,2vw,0.9rem)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    minHeight: 44,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  // Equivalente a .btn-responsive .btn-primary
  btn: {
    padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#00E676',
    color: '#003049',
    fontWeight: 700,
    fontSize: 'clamp(0.8rem,2vw,0.875rem)',
    cursor: 'pointer',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'opacity 0.15s',
  } as React.CSSProperties,
  // Equivalente a .btn-responsive .btn-secondary
  btnGhost: {
    padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)',
    borderRadius: '0.5rem',
    background: 'transparent',
    border: '1px solid rgba(0,230,118,0.3)',
    color: 'rgba(224,247,250,0.6)',
    fontWeight: 500,
    fontSize: 'clamp(0.8rem,2vw,0.875rem)',
    cursor: 'pointer',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
  } as React.CSSProperties,
  chip: {
    padding: 'clamp(0.375rem,1.5vw,0.5rem) clamp(0.625rem,2vw,1rem)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem,2vw,0.875rem)',
    fontWeight: 500,
    transition: 'all 0.15s',
    minHeight: 40,
    border: '1px solid transparent',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  sectionTitle: {
    color: '#e0f7fa',
    fontWeight: 600,
    marginBottom: '0.2rem',
    fontSize: 'clamp(0.8rem,2vw,0.9rem)',
  } as React.CSSProperties,
  sectionDesc: {
    color: 'rgba(224,247,250,0.5)',
    fontSize: 'clamp(0.7rem,1.8vw,0.8rem)',
    margin: 0,
    lineHeight: 1.5,
  } as React.CSSProperties,
  divider: {
    height: '1px',
    background: 'rgba(0,230,118,0.12)',
    margin: 'clamp(0.5rem,2vw,0.75rem) 0',
  } as React.CSSProperties,
};

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={msg.ok ? 'settings-feedback-success' : 'settings-feedback-error'}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: 'clamp(0.5rem,1.5vw,0.75rem) 1rem', borderRadius: '0.5rem', marginTop: '1rem',
        background: msg.ok ? 'rgba(0,230,118,0.12)' : 'rgba(239,68,68,0.12)',
        border: `1px solid ${msg.ok ? 'rgba(0,230,118,0.35)' : 'rgba(239,68,68,0.35)'}`,
        color: msg.ok ? '#00E676' : '#f87171', fontSize: 'clamp(0.75rem,2vw,0.875rem)',
      }}>
      {msg.ok ? <Check size={15} /> : <AlertCircle size={15} />}
      {msg.text}
    </motion.div>
  );
}

// ── ProfileTab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { t } = useTranslation();
  const { requestSettingsOTP } = useAuth();
  const auth = getAuth();
  const currentName = auth.user?.name || '';
  const [step, setStep] = useState<'view' | 'edit' | 'otp' | 'saving'>('view');
  const [name, setName] = useState(currentName);
  const [nameOtp, setNameOtp] = useState('');
  const [pwStep, setPwStep] = useState<'view' | 'form' | 'otp' | 'saving'>('view');
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordOtp, setPasswordOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const cancel = () => { setStep('view'); setName(currentName); setNameOtp(''); setMsg(null); };
  const cancelPw = () => { setPwStep('view'); setForm({ current: '', next: '', confirm: '' }); setPasswordOtp(''); setMsg(null); };
  const nameChanged = name.trim() !== currentName && name.trim().length > 0;

  const requestCode = async () => {
    if (!nameChanged) return;
    setLoading(true);
    try {
      await requestSettingsOTP();
      setStep('otp');
      setMsg({ text: t('settings.profile.code_sent'), ok: true });
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed to send code', ok: false });
    } finally { setLoading(false); setTimeout(() => setMsg(null), 4000); }
  };

  const save = async () => {
    if (nameOtp.length !== 6) { setMsg({ text: t('settings.profile.enter_code'), ok: false }); return; }
    setStep('saving'); setLoading(true);
    try {
      const res = await fetch(`${_apiHost}/auth/me`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), otp: nameOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      const saved = getAuth();
      saved.user = { ...saved.user, name: data.name };
      localStorage.setItem(AUTH_KEY, JSON.stringify(saved));
      setMsg({ text: t('settings.profile.success'), ok: true });
      setStep('view');
    } catch (e: any) {
      setMsg({ text: e.message || t('settings.profile.error'), ok: false });
      setStep('otp');
    } finally { setLoading(false); setTimeout(() => setMsg(null), 4000); }
  };

  const requestPwCode = async () => {
    if (form.next !== form.confirm) { setMsg({ text: t('settings.security.mismatch'), ok: false }); return; }
    if (form.next.length < 8) { setMsg({ text: t('settings.security.too_short'), ok: false }); return; }
    setLoading(true);
    try {
      await requestSettingsOTP();
      setPwStep('otp');
      setMsg({ text: t('settings.profile.code_sent'), ok: true });
    } catch (e: any) { setMsg({ text: e.message || 'Failed to send code', ok: false }); }
    finally { setLoading(false); setTimeout(() => setMsg(null), 4000); }
  };

  const savePw = async () => {
    if (passwordOtp.length !== 6) { setMsg({ text: t('settings.profile.enter_code'), ok: false }); return; }
    setPwStep('saving'); setLoading(true);
    try {
      const res = await fetch(`${_apiHost}/auth/me/password`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ current_password: form.current, new_password: form.next, otp: passwordOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '');
      setMsg({ text: t('settings.security.success'), ok: true });
      cancelPw();
    } catch (e: any) {
      setMsg({ text: e.message || t('settings.security.error'), ok: false }); setPwStep('otp');
    } finally { setLoading(false); setTimeout(() => setMsg(null), 5000); }
  };

  return (
    <div>
      <label className="settings-label" style={S.label}>{t('settings.profile.display_name')}</label>
      <AnimatePresence mode="wait">
        {step === 'view' && (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="settings-input" style={{ ...S.input, flex: 1, opacity: 0.8, display: 'flex', alignItems: 'center', minWidth: 'clamp(140px,40vw,200px)' }}>{currentName}</div>
              <button onClick={() => { setStep('edit'); setName(currentName); }}
                className="settings-btn-secondary" style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 'clamp(0.4rem,1.5vw,0.6rem) clamp(0.75rem,2vw,1rem)', fontSize: 'clamp(0.75rem,2vw,0.825rem)' }}>
                <Edit3 size={14} /> {t('settings.profile.edit')}
              </button>
            </div>
          </motion.div>
        )}
        {step === 'edit' && (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <input className="settings-input" value={name} onChange={e => setName(e.target.value)}
              style={{ ...S.input, borderColor: nameChanged ? '#00E676' : 'rgba(0,230,118,0.25)' }} autoFocus />
            <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.45)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', margin: '0.5rem 0 0.75rem' }}>
              {t('settings.profile.code_hint')}
            </p>
            <div className="settings-btn-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="settings-btn-primary" onClick={requestCode} disabled={!nameChanged || loading} style={{ ...S.btn, opacity: nameChanged ? 1 : 0.4 }}>
                {loading ? t('settings.profile.sending') : `📧 ${t('settings.profile.send_code')}`}
              </button>
              <button className="settings-btn-secondary" onClick={cancel} style={S.btnGhost}>{t('settings.profile.cancel')}</button>
            </div>
          </motion.div>
        )}
        {(step === 'otp' || step === 'saving') && (
          <motion.div key="otp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="settings-highlight-box" style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '0.5rem', padding: 'clamp(0.625rem,2vw,0.875rem) 1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div><span className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.65rem,1.5vw,0.75rem)' }}>{t('settings.profile.current')}</span><div className="settings-text-error" style={{ color: '#f87171', fontWeight: 600 }}>{currentName}</div></div>
              <div className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.3)', alignSelf: 'center' }}>→</div>
              <div><span className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.65rem,1.5vw,0.75rem)' }}>{t('settings.profile.new_label')}</span><div className="settings-text-success" style={{ color: '#00E676', fontWeight: 600 }}>{name.trim()}</div></div>
            </div>
            <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.6)', fontSize: 'clamp(0.75rem,2vw,0.825rem)', marginBottom: '0.5rem' }}>
              Enter the code sent to <strong className="settings-text-success" style={{ color: '#00E676' }}>{auth.user?.email}</strong>
            </p>
            <input className="settings-input" value={nameOtp} onChange={e => setNameOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" maxLength={6} autoFocus
              style={{ ...S.input, textAlign: 'center', letterSpacing: '6px', fontSize: 'clamp(1rem,3vw,1.2rem)', fontWeight: 700 }} />
            <div className="settings-btn-group" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="settings-btn-primary" onClick={save} disabled={step === 'saving' || nameOtp.length !== 6}
                style={{ ...S.btn, opacity: nameOtp.length === 6 ? 1 : 0.4 }}>
                {step === 'saving' ? t('settings.profile.confirming') : `✅ ${t('settings.profile.confirm_change')}`}
              </button>
              <button className="settings-btn-secondary" onClick={cancel} disabled={step === 'saving'} style={S.btnGhost}>{t('settings.profile.cancel')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="settings-divider" style={S.divider} />
      <label className="settings-label" style={{ ...S.label, marginTop: '0.75rem' }}>{t('settings.profile.email')}</label>
      <input className="settings-input" value={auth.user?.email || ''} disabled style={{ ...S.input, opacity: 0.5 }} />
      <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.4)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', marginTop: '0.35rem' }}>
        {t('settings.profile.email_note')}
      </p>

      <div className="settings-divider" style={S.divider} />
      <label className="settings-label" style={{ ...S.label, marginTop: '0.75rem' }}>{t('settings.security.password')}</label>
      <AnimatePresence mode="wait">
        {pwStep === 'view' && (
          <motion.div key="pw-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <input className="settings-input" value="••••••••••••" disabled style={{ ...S.input, opacity: 0.5 }} />
            <button className="settings-btn-secondary" onClick={() => setPwStep('form')} style={{ ...S.btnGhost, marginTop: '0.75rem' }}>{t('settings.security.edit')}</button>
          </motion.div>
        )}
        {pwStep === 'form' && (
          <motion.div key="pw-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {([['current', t('settings.security.current')], ['next', t('settings.security.new')], ['confirm', t('settings.security.confirm')]] as [keyof typeof form, string][]).map(([field, label]) => (
              <div key={field} style={{ marginBottom: '0.75rem' }}>
                <label className="settings-label" style={S.label}>{label}</label>
                <input className="settings-input" type="password" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={S.input} placeholder="••••••••" />
              </div>
            ))}
            <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.45)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', marginBottom: '0.75rem' }}>
              {t('settings.security.code_hint')}
            </p>
            <div className="settings-btn-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="settings-btn-primary" onClick={requestPwCode} disabled={loading} style={S.btn}>
                {loading ? t('settings.security.sending_code') : `📧 ${t('settings.security.send_code')}`}
              </button>
              <button className="settings-btn-secondary" onClick={cancelPw} style={S.btnGhost}>{t('settings.security.cancel')}</button>
            </div>
          </motion.div>
        )}
        {(pwStep === 'otp' || pwStep === 'saving') && (
          <motion.div key="pw-otp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.6)', fontSize: 'clamp(0.75rem,2vw,0.825rem)', marginBottom: '0.5rem' }}>
              Enter the code sent to <strong className="settings-text-success" style={{ color: '#00E676' }}>{auth.user?.email}</strong>
            </p>
            <input className="settings-input" value={passwordOtp} onChange={e => setPasswordOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" maxLength={6}
              style={{ ...S.input, textAlign: 'center', letterSpacing: '6px', fontSize: 'clamp(1rem,3vw,1.2rem)', fontWeight: 700 }} autoFocus />
            <div className="settings-btn-group" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="settings-btn-primary" onClick={savePw} disabled={pwStep === 'saving' || passwordOtp.length !== 6}
                style={{ ...S.btn, opacity: passwordOtp.length === 6 ? 1 : 0.4 }}>
                {pwStep === 'saving' ? t('settings.profile.confirming') : `✅ ${t('settings.profile.confirm_change')}`}
              </button>
              <button className="settings-btn-secondary" onClick={cancelPw} disabled={pwStep === 'saving'} style={S.btnGhost}>{t('settings.security.cancel')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Feedback msg={msg} />
    </div>
  );
}


// ── AppearanceTab ──────────────────────────────────────────────────────────
function AppearanceTab() {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useI18n();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(userKey('fontSize')) || 'medium');
  const [theme, setTheme] = useState(() => localStorage.getItem(userKey('theme')) || 'dark');

  const applyFontSize = (size: string) => {
    const map: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = map[size];
    localStorage.setItem(userKey('fontSize'), size);
    setFontSize(size);
  };

  const applyTheme = (th: string) => {
    document.documentElement.classList.remove('light');
    if (th === 'light') document.documentElement.classList.add('light');
    else if (th === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.classList.add('light');
    localStorage.setItem(userKey('theme'), th);
    setTheme(th);
  };

  const themeOptions: [string, string][] = [['dark', t('settings.appearance.dark')], ['light', t('settings.appearance.light')], ['auto', t('settings.appearance.auto')]];
  const sizeOptions: [string, string][] = [['small', t('settings.appearance.small')], ['medium', t('settings.appearance.medium')], ['large', t('settings.appearance.large')]];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label className="settings-label" style={S.label}>{t('settings.appearance.language')}</label>
        <select className="settings-input" value={currentLanguage} onChange={e => setLanguage(e.target.value)}
          style={{ ...S.input, cursor: 'pointer' } as React.CSSProperties}>
          <option value="pt">Português</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </div>
      <div>
        <label className="settings-label" style={S.label}>{t('settings.appearance.theme')}</label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {themeOptions.map(([val, lbl]) => (
            <button className={`settings-chip ${theme === val ? 'active' : ''}`} key={val} onClick={() => applyTheme(val)} style={{
              ...S.chip,
              background: theme === val ? 'rgba(0,230,118,0.2)' : 'rgba(0,48,73,0.4)',
              border: `1px solid ${theme === val ? '#00E676' : 'rgba(0,230,118,0.2)'}`,
              color: theme === val ? '#00E676' : 'rgba(224,247,250,0.7)',
            }}>{lbl}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="settings-label" style={S.label}>{t('settings.appearance.font_size')}</label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {sizeOptions.map(([val, lbl]) => (
            <button className={`settings-chip ${fontSize === val ? 'active' : ''}`} key={val} onClick={() => applyFontSize(val)} style={{
              ...S.chip,
              background: fontSize === val ? 'rgba(0,230,118,0.2)' : 'rgba(0,48,73,0.4)',
              border: `1px solid ${fontSize === val ? '#00E676' : 'rgba(0,230,118,0.2)'}`,
              color: fontSize === val ? '#00E676' : 'rgba(224,247,250,0.7)',
            }}>{lbl}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ChatTab ────────────────────────────────────────────────────────────────
function ChatTab() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  // ── Enterprise state ──
  const PREFS_KEY = 'gaiamind-chat-prefs';
  const DEFAULT_PREFS = {
    response_mode: 'balanced', verbosity: 'medium', audience: 'intermediate',
    output_format: 'markdown', reasoning_depth: 'standard',
    save_history: true, auto_suggestions: true,
  };
  const loadLocal = () => { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return DEFAULT_PREFS; } };
  const [prefs, setPrefs] = useState(loadLocal);
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);
  const [clearStep, setClearStep] = useState<'idle' | 'confirm' | 'clearing'>('idle');

  // Carregar do backend no mount
  useEffect(() => {
    const token = getToken?.();
    if (!token) return;
    fetch(`${_apiHost}/api/preferences`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.preferences) {
          const merged = { ...DEFAULT_PREFS, ...data.preferences };
          setPrefs(merged);
          localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
        }
      }).catch(() => {});
  }, []);

  const set = (key: string, val: unknown) => setPrefs((p: typeof DEFAULT_PREFS) => ({ ...p, [key]: val }));

  const save = async () => {
    setLoading(true);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem('chat-history-enabled', String(prefs.save_history));
    localStorage.setItem('chat-response-mode', prefs.response_mode);
    localStorage.setItem('chat-suggestions', String(prefs.auto_suggestions));
    try {
      if (getToken?.()) {
        const res = await fetch(`${_apiHost}/api/preferences`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(prefs),
        });
        if (!res.ok) throw new Error();
      }
      setMsg({ text: t('settings.chat.saved'), ok: true });
    } catch { setMsg({ text: t('settings.chat.saved'), ok: true }); }
    finally { setLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const clearAllChats = async () => {
    setClearStep('clearing');
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const convs = await ChatHistoryService.listConversations();
      if (Array.isArray(convs) && convs.length > 0) {
        await Promise.all(convs.map((c: any) => ChatHistoryService.deleteConversation(c.id).catch(() => {})));
      }
      localStorage.removeItem('gaiamind-sidebar-convs');
      setMsg({ text: t('settings.chat.clear_chats_success'), ok: true });
      setClearStep('idle');
    } catch {
      setMsg({ text: t('settings.chat.clear_chats_error'), ok: false });
      setClearStep('idle');
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const chip = (active: boolean) => ({
    ...S.chip,
    background: active ? 'rgba(0,230,118,0.2)' : 'rgba(0,48,73,0.4)',
    border: `1px solid ${active ? '#00E676' : 'rgba(0,230,118,0.2)'}`,
    color: active ? '#00E676' : 'rgba(224,247,250,0.7)',
  });

  const MODES = [
    { v: 'concise', l: t('settings.chat.concise') },
    { v: 'balanced', l: t('settings.chat.balanced') },
    { v: 'detailed', l: t('settings.chat.detailed') },
    { v: 'stepbystep', l: t('settings.chat.stepbystep') },
    { v: 'research', l: 'Research' },
    { v: 'expert', l: 'Expert' },
    { v: 'executive', l: 'Executive' },
    { v: 'teaching', l: 'Teaching' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={S.row}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="settings-section-title" style={S.sectionTitle}>{t('settings.chat.history')}</p>
          <p className="settings-section-desc" style={S.sectionDesc}>{t('settings.chat.history_desc')}</p>
        </div>
        <Toggle value={prefs.save_history} onChange={v => set('save_history', v)} />
      </div>
      <div style={S.row}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="settings-section-title" style={S.sectionTitle}>{t('settings.chat.suggestions')}</p>
          <p className="settings-section-desc" style={S.sectionDesc}>{t('settings.chat.suggestions_desc')}</p>
        </div>
        <Toggle value={prefs.auto_suggestions} onChange={v => set('auto_suggestions', v)} />
      </div>

      <div style={S.divider} />

      {/* Response Mode */}
      <div>
        <label style={S.label}>{t('settings.chat.response_mode')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {MODES.map(m => <button key={m.v} onClick={() => set('response_mode', m.v)} style={chip(prefs.response_mode === m.v)}>{m.l}</button>)}
        </div>
      </div>

      {/* Verbosity */}
      <div>
        <label style={S.label}>Length</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['short','medium','long','very_long'] as const).map(v => (
            <button key={v} onClick={() => set('verbosity', v)} style={chip(prefs.verbosity === v)}>
              {v === 'very_long' ? 'Very long' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div>
        <label style={S.label}>Audience</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['beginner','intermediate','professional','executive','academic'] as const).map(v => (
            <button key={v} onClick={() => set('audience', v)} style={chip(prefs.audience === v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reasoning Depth */}
      <div>
        <label style={S.label}>Reasoning Depth</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['minimal','standard','high','deep'] as const).map(v => (
            <button key={v} onClick={() => set('reasoning_depth', v)} style={chip(prefs.reasoning_depth === v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Output Format */}
      <div>
        <label style={S.label}>Output Format</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['paragraph','markdown','bullet_points','numbered_steps','table'] as const).map(v => (
            <button key={v} onClick={() => set('output_format', v)} style={chip(prefs.output_format === v)}>
              {v === 'bullet_points' ? 'Bullets' : v === 'numbered_steps' ? 'Steps' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Saving…' : t('settings.chat.save')}
      </button>

      <div style={S.divider} />

      {/* Clear all chats */}
      <div>
        <p style={{ ...S.sectionTitle, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Trash2 size={15} style={{ color: '#f87171' }} /> {t('settings.chat.clear_chats')}
        </p>
        <p style={{ ...S.sectionDesc, marginBottom: '0.75rem' }}>{t('settings.chat.clear_chats_desc')}</p>
        <AnimatePresence mode="wait">
          {clearStep === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setClearStep('confirm')} style={{ ...S.btn, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
                {t('settings.chat.clear_chats_btn')}
              </button>
            </motion.div>
          )}
          {clearStep === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                <p style={{ color: 'rgba(224,247,250,0.8)', fontSize: 'clamp(0.75rem,2vw,0.875rem)', margin: 0 }}>{t('settings.chat.clear_chats_confirm')}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={clearAllChats} style={{ ...S.btn, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none' }}>{t('settings.chat.clear_chats_yes')}</button>
                <button onClick={() => setClearStep('idle')} style={S.btnGhost}>{t('settings.chat.clear_chats_cancel')}</button>
              </div>
            </motion.div>
          )}
          {clearStep === 'clearing' && (
            <motion.div key="clearing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={{ color: 'rgba(224,247,250,0.6)', fontSize: 'clamp(0.75rem,2vw,0.875rem)' }}>⏳ {t('settings.chat.clearing')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Feedback msg={msg} />
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`settings-toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)} style={{
      width: '44px', height: '24px', borderRadius: '12px', border: 'none',
      background: value ? '#00E676' : 'rgba(255,255,255,0.15)',
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}

// ── AccountTab ─────────────────────────────────────────────────────────────
function AccountTab() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const auth = getAuth();
  const [step, setStep] = useState<'idle' | 'confirm' | 'typing' | 'deleting'>('idle');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const CONFIRM_WORD = t('settings.account.confirm_word');

  const handleDelete = async () => {
    if (typed !== CONFIRM_WORD) { setError(t('settings.account.type_error')); return; }
    setStep('deleting'); setError(null);
    try {
      const token = JSON.parse(localStorage.getItem('gaiamind-auth') || '{}').token;
      const res = await fetch(`${_apiHost}/auth/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete account');
      localStorage.removeItem('gaiamind-auth');
      logout();
    } catch (e: any) { setError(e.message); setStep('typing'); }
  };

  return (
    <div>
      {/* User info */}
      <div className="settings-card" style={{ background: 'rgba(0,48,73,0.4)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '0.5rem', padding: 'clamp(0.75rem,2vw,1rem)', marginBottom: 'clamp(1rem,3vw,1.5rem)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} style={{ color: '#00E676' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="settings-text-success" style={{ color: '#e0f7fa', fontWeight: 600, fontSize: 'clamp(0.85rem,2.5vw,0.95rem)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.user?.name || '—'}</p>
          <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.user?.email || '—'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <Trash2 size={18} style={{ color: '#f87171' }} />
        <p className="settings-text-error" style={{ color: '#f87171', fontWeight: 700, fontSize: 'clamp(0.85rem,2.5vw,0.95rem)', margin: 0 }}>{t('settings.account.title')}</p>
      </div>
      <div className="settings-warning-box" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: 'clamp(0.75rem,2vw,1rem)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: 'rgba(224,247,250,0.8)', fontSize: 'clamp(0.75rem,2vw,0.875rem)', lineHeight: 1.6 }}>
            <strong className="settings-text-error" style={{ color: '#f87171', display: 'block', marginBottom: '0.375rem' }}>{t('settings.account.warning_title')}</strong>
            {t('settings.account.warning_body')}
            <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, color: 'rgba(224,247,250,0.65)', fontSize: 'clamp(0.7rem,1.8vw,0.825rem)' }}>
              <li>{t('settings.account.item_1')}</li>
              <li>{t('settings.account.item_2')}</li>
              <li>{t('settings.account.item_3')}</li>
            </ul>
            <span className="settings-text-muted" style={{ display: 'block', marginTop: '0.5rem', color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)' }}>{t('settings.account.warning_footer')}</span>
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="settings-btn-danger" onClick={() => setStep('confirm')} style={{ ...S.btn, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
              {t('settings.account.btn_start')}
            </button>
          </motion.div>
        )}
        {(step === 'confirm' || step === 'typing' || step === 'deleting') && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="settings-text-muted" style={{ color: 'rgba(224,247,250,0.7)', fontSize: 'clamp(0.75rem,2vw,0.875rem)', marginBottom: '0.75rem' }}>
              {t('settings.account.confirm_hint')} <strong className="settings-text-error" style={{ color: '#f87171' }}>{CONFIRM_WORD}</strong>:
            </p>
            <input className="settings-input" value={typed} onChange={e => { setTyped(e.target.value); setError(null); }}
              placeholder={CONFIRM_WORD} disabled={step === 'deleting'}
              style={{ ...S.input, borderColor: typed === CONFIRM_WORD ? 'rgba(239,68,68,0.6)' : 'rgba(0,230,118,0.25)', marginBottom: '0.75rem' }} />
            {error && (
              <div className="settings-text-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: 'clamp(0.7rem,1.8vw,0.825rem)', marginBottom: '0.75rem' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div className="settings-btn-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="settings-btn-danger" onClick={handleDelete} disabled={step === 'deleting' || typed !== CONFIRM_WORD}
                style={{ ...S.btn, background: typed === CONFIRM_WORD ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.2)', color: '#fff', border: 'none', opacity: typed === CONFIRM_WORD ? 1 : 0.5, transition: 'all 0.2s' }}>
                {step === 'deleting' ? t('settings.account.deleting') : t('settings.account.btn_delete')}
              </button>
              <button className="settings-btn-secondary" onClick={() => { setStep('idle'); setTyped(''); setError(null); }} disabled={step === 'deleting'} style={S.btnGhost}>
                {t('settings.account.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Settings (main) ────────────────────────────────────────────────────────
const CONTENT: Record<Tab, React.FC> = {
  profile: ProfileTab, appearance: AppearanceTab,
  chat: ChatTab, privacy: Privacy, account: AccountTab,
};

export function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const Content = CONTENT[activeTab];

  const TABS: { id: Tab; icon: typeof User; danger?: boolean }[] = [
    { id: 'profile',    icon: User },
    { id: 'appearance', icon: Palette },
    { id: 'chat',       icon: MessageSquare },
    { id: 'privacy',    icon: Shield },
    { id: 'account',    icon: Trash2, danger: true },
  ];

  return (
    <div className="component-container settings-container">
      <div className="settings-wrapper">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="section-title settings-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            ⚙️ {t('settings.title')}
          </h1>

          {/* Tabs — scroll horizontal em xs, labels ocultos em xs */}
          <div className="settings-tabs">
            {TABS.map(({ id, icon: Icon, danger }) => (
              <button key={id} onClick={() => setActiveTab(id)} className={activeTab === id ? 'active' : ''} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: 'clamp(0.4rem,1.5vw,0.6rem) clamp(0.625rem,2vw,1rem)',
                borderRadius: '0.5rem', border: 'none', flexShrink: 0,
                background: activeTab === id
                  ? (danger ? 'rgba(239,68,68,0.15)' : 'rgba(0,230,118,0.18)')
                  : 'transparent',
                color: activeTab === id
                  ? (danger ? '#f87171' : '#00E676')
                  : (danger ? 'rgba(248,113,113,0.6)' : 'rgba(224,247,250,0.55)'),
                fontWeight: activeTab === id ? 600 : 400,
                cursor: 'pointer', fontSize: 'clamp(0.75rem,2vw,0.875rem)', transition: 'all 0.15s',
              }}>
                <Icon size={15} />
                <span className="settings-tab-label">
                  {id === 'account' ? t('settings.tabs.account') : t(`settings.tabs.${id}`)}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
            className="card-base">
            <Content />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
