const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_NO_SLASH = API_BASE.replace(/\/$/, '');
const AUTH_KEY = 'gaiamind-auth';

export function getToken(): string | null {
  try { const s = localStorage.getItem(AUTH_KEY); return s ? JSON.parse(s).token : null; } catch { return null; }
}

function getRefreshToken(): string | null {
  try { const s = localStorage.getItem(AUTH_KEY); return s ? JSON.parse(s).refresh_token : null; } catch { return null; }
}

let _refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) return null;
    try {
      const res = await fetch(`${API_BASE_NO_SLASH}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      try {
        const saved = localStorage.getItem(AUTH_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.token = data.access_token;
          if (data.refresh_token) parsed.refresh_token = data.refresh_token;
          localStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
      return data.access_token as string;
    } catch { return null; }
    finally { _refreshing = null; }
  })();
  return _refreshing;
}

// Origens permitidas para authFetch (CWE-918)
const _ALLOWED_ORIGINS = [
  new URL(API_BASE).origin,
  window.location.origin,
];

function _assertSafeUrl(url: string): void {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!_ALLOWED_ORIGINS.includes(parsed.origin)) {
      throw new Error(`[authFetch] URL bloqueada por política SSRF: ${parsed.origin}`);
    }
  } catch (e) {
    if ((e as Error).message.includes('bloqueada')) throw e;
    // URL relativa — permitida
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  _assertSafeUrl(url);
  // URL validada uma vez, reutilizada em ambos os fetches (CWE-918)
  const safeUrl = url;
  const isFormData = options.body instanceof FormData;
  const buildHeaders = (token: string | null) => ({
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  });

  let res = await fetch(safeUrl, { ...options, headers: buildHeaders(getToken()) });

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await fetch(safeUrl, { ...options, headers: buildHeaders(newToken) });
    } else {
      localStorage.removeItem(AUTH_KEY);
      window.location.href = '/';
    }
  }
  return res;
}
