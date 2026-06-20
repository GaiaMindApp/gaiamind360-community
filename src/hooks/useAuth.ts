import { useState, useEffect } from 'react';
import { AuthState, User } from '../types/auth';
import {
  secureSetAuth,
  secureGetAuth,
  secureGetAuthSync,
  secureWipeAuth,
  getDeviceFingerprint,
} from '../services/secureStorage';

const _apiHost = (() => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8000`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
})();
const API = `${_apiHost}/auth`;
const AUTH_KEY = 'gaiamind-auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });

  useEffect(() => {
    // Validação assíncrona com integrity check
    secureGetAuth().then((parsed) => {
      if (parsed?.user && parsed?.token) {
        setAuthState({ user: { ...parsed.user, createdAt: new Date(parsed.user.createdAt) }, isAuthenticated: true });
      }
    }).catch(() => {
      secureWipeAuth();
    });
  }, []);

  const _saveAuth = async (token: string, user_id: string, email: string, name: string, role: string = 'user', refresh_token?: string) => {
    const user: User = { id: String(user_id), email, name, role: role as User['role'], createdAt: new Date() };
    await secureSetAuth({ user: { ...user, createdAt: user.createdAt.toISOString() }, token, refresh_token: refresh_token || '', role });
    setAuthState({ user, isAuthenticated: true });
    window.location.reload();
  };

  const requestOTP = async (email: string, name: string): Promise<void> => {
    const fingerprint = await getDeviceFingerprint();
    const res = await fetch(`${API}/register/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Fingerprint': fingerprint },
      body: JSON.stringify({ email, name }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erro ao enviar código'); }
  };

  const verifyOTP = async (email: string, name: string, password: string, otp: string): Promise<void> => {
    const res = await fetch(`${API}/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail || 'Código inválido';
      // Nunca expor erros técnicos do servidor
      if (msg.toLowerCase().includes('psycopg') || msg.toLowerCase().includes('sql') || msg.toLowerCase().includes('unique')) {
        throw new Error('Erro interno. Tenta novamente ou contacta o suporte.');
      }
      throw new Error(msg);
    }
    _saveAuth(data.access_token, data.user_id, email, name, data.role || 'user', data.refresh_token);
  };

  const login = async (email: string, password: string): Promise<string> => {
    const fingerprint = await getDeviceFingerprint();
    const res = await fetch(`${API}/login/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Fingerprint': fingerprint },
      body: JSON.stringify({ email, password }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Erro de rede. Tenta novamente.');
    }
    if (!res.ok) throw new Error(data.detail || 'Email ou password incorretos');
    return data.message; // "Código enviado para o teu email"
  };

  const verifyLoginOTP = async (email: string, otp: string): Promise<void> => {
    const res = await fetch(`${API}/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Erro de rede. Tenta novamente.');
    }
    if (!res.ok) throw new Error(data.detail || 'Código inválido');
    let role = data.role || 'user';
    _saveAuth(data.access_token, data.user_id, email, data.name || email.split('@')[0], role, data.refresh_token);
  };

  const requestSettingsOTP = async (): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error('Não autenticado');
    const res = await fetch(`${API}/settings/request-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erro ao enviar código'); }
  };

  const logoutAll = async (): Promise<void> => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API}/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erro ao terminar sessões');
    logout();
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    const res = await fetch(`${API}/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erro ao enviar código'); }
  };

  const verifyPasswordReset = async (email: string, otp: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${API}/password-reset/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Código inválido');
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthState({ user: null, isAuthenticated: false });
    window.location.href = '/';
  };

  const getToken = (): string | null => {
    try { const s = localStorage.getItem(AUTH_KEY); return s ? JSON.parse(s).token : null; } catch { return null; }
  };

  const getRole = (): string => {
    try {
      const s = localStorage.getItem(AUTH_KEY);
      if (!s) return 'user';
      const parsed = JSON.parse(s);
      const token = parsed?.token;
      if (!token) return 'user';
      // Ler role directamente do payload JWT (não do localStorage)
      const parts = token.split('.');
      if (parts.length !== 3) return 'user';
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      // Verificar expiração
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(AUTH_KEY);
        return 'user';
      }
      return payload.role || 'user';
    } catch { return 'user'; }
  };

  return { ...authState, login, verifyLoginOTP, logout, logoutAll, requestOTP, verifyOTP, requestPasswordReset, verifyPasswordReset, requestSettingsOTP, getToken, getRole };
}
