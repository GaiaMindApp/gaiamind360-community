/**
 * AICopilot — GaiaMind Digital Twin Earth
 * Natural-language globe interface via CognitiveKernel /api/chat.
 * Requirements: 12.1–12.8 — Properties 25–27
 */
import React, { useState, useRef, useCallback } from 'react';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import type { GlobeAction, LayerType } from '../types/digitalTwin.types';

const MAX_QUERY_LENGTH = 2000;
const TIMEOUT_MS       = 10_000;
const MAX_HISTORY      = 5;

// ── Validation (Property 25) ──────────────────────────────────────────────────
export function validateCopilotQuery(s: string): { valid: boolean } {
  return { valid: s.length <= MAX_QUERY_LENGTH };
}

// ── Globe action parsing (Property 26) ───────────────────────────────────────
export function parseGlobeAction(response: unknown): GlobeAction | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  const ga = r.globe_action;
  if (!ga || typeof ga !== 'object') return null;
  const a = ga as Record<string, unknown>;
  if (a.action === 'navigate'           && typeof a.iso3 === 'string') return { action: 'navigate', iso3: a.iso3 };
  if (a.action === 'activate-layer'     && typeof a.layer === 'string') return { action: 'activate-layer', layer: a.layer as LayerType };
  if (a.action === 'highlight-countries' && Array.isArray(a.iso3_list)) return { action: 'highlight-countries', iso3_list: a.iso3_list as string[] };
  return null;
}

// ── Copilot history window (Property 27) ─────────────────────────────────────
export function trimHistory(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  n: number
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const last = Math.min(n, MAX_HISTORY);
  return history.slice(-last);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Exchange { role: 'user' | 'assistant'; content: string; }

interface Props { open: boolean; }

export function AICopilot({ open }: Props): React.ReactElement {
  const [query,       setQuery]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [charError,   setCharError]   = useState<string | null>(null);
  const [history,     setHistory]     = useState<Exchange[]>([]);
  const [collapsed,   setCollapsed]   = useState(false);
  const [timedOut,    setTimedOut]    = useState(false);

  const abortRef   = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flyTo       = digitalTwinStore.flyTo;
  const toggleLayer = digitalTwinStore.toggleLayer;

  const dispatchGlobeAction = useCallback((action: GlobeAction) => {
    if (action.action === 'navigate') {
      flyTo(action.iso3);
    } else if (action.action === 'activate-layer') {
      toggleLayer(action.layer);
    }
    // highlight-countries: TODO wire to store when highlight feature added
  }, [flyTo, toggleLayer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCopilotQuery(query);
    if (!validation.valid) {
      setCharError(`Query exceeds ${MAX_QUERY_LENGTH} characters. Please shorten it.`);
      return;
    }
    setCharError(null);
    if (!query.trim() || loading) return;

    const userMessage = query.trim();
    setQuery('');
    setLoading(true);
    setError(null);
    setTimedOut(false);
    setCollapsed(false);

    const context = trimHistory(history, MAX_HISTORY);

    abortRef.current = new AbortController();
    timeoutRef.current = setTimeout(() => {
      abortRef.current?.abort();
      setTimedOut(true);
      setLoading(false);
    }, TIMEOUT_MS);

    try {
      const token = localStorage.getItem('auth_token') ?? '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage, context }),
        signal: abortRef.current.signal,
      });

      clearTimeout(timeoutRef.current);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const globeAction = parseGlobeAction(data);
      if (globeAction) dispatchGlobeAction(globeAction);

      const assistantContent = data.text_response ?? data.response ?? data.message ?? '';

      setHistory((prev) => [
        ...prev,
        { role: 'user',      content: userMessage },
        { role: 'assistant', content: assistantContent },
      ]);
    } catch (err: unknown) {
      clearTimeout(timeoutRef.current!);
      if ((err as Error)?.name !== 'AbortError') {
        setError('GaiaMind Assistant is temporarily unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return <></>;

  const recentHistory = trimHistory(history, MAX_HISTORY);

  return (
    <div
      role="region"
      aria-label="AI Copilot — natural language globe interface"
      style={{
        position: 'fixed',
        bottom: 140,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 480,
        maxWidth: '90vw',
        background: 'rgba(8,12,25,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        zIndex: 9200,
        fontFamily: '"Google Sans", sans-serif',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Chat history */}
      {!collapsed && recentHistory.length > 0 && (
        <div
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
          aria-live="polite"
          aria-label="Conversation history"
        >
          {recentHistory.map((ex, i) => (
            <div
              key={i}
              style={{
                background: ex.role === 'user' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                lineHeight: 1.6,
                color: ex.role === 'user' ? '#93c5fd' : 'rgba(255,255,255,0.85)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 10, opacity: 0.6, display: 'block', marginBottom: 2 }}>
                {ex.role === 'user' ? 'You' : 'GaiaMind'}
              </span>
              {ex.content}
            </div>
          ))}
        </div>
      )}

      {/* Status messages */}
      {timedOut && (
        <div role="alert" style={{ padding: '8px 16px', color: '#f59e0b', fontSize: 12 }}>
          ⚠️ GaiaMind Assistant is temporarily unavailable.
        </div>
      )}
      {error && !timedOut && (
        <div role="alert" style={{ padding: '8px 16px', color: '#ef4444', fontSize: 12 }}>{error}</div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: 6 }}>
        {charError && (
          <div role="alert" aria-live="assertive" style={{ color: '#ef4444', fontSize: 11 }}>{charError}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (charError && e.target.value.length <= MAX_QUERY_LENGTH) setCharError(null);
              }}
              placeholder="Ask GaiaMind… e.g. 'Show climate risk in Southeast Asia'"
              disabled={loading || timedOut}
              maxLength={MAX_QUERY_LENGTH + 100} // allow typing past limit to show error
              rows={2}
              aria-label="Query input"
              aria-describedby={charError ? 'copilot-char-error' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${charError ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
                padding: '8px 10px',
                resize: 'none',
                outline: 'none',
                fontFamily: '"Google Sans", sans-serif',
              }}
            />
            <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 9, color: query.length > MAX_QUERY_LENGTH ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
              {query.length}/{MAX_QUERY_LENGTH}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="submit"
              disabled={loading || timedOut || !query.trim()}
              aria-label="Send query"
              style={{
                background: loading ? 'rgba(255,255,255,0.1)' : '#3b82f6',
                border: 'none', borderRadius: 8,
                color: '#fff', padding: '8px 14px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {loading ? '⌛' : '↑'}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand responses' : 'Collapse responses'}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#fff', padding: '3px 8px', fontSize: 10, cursor: 'pointer',
              }}
            >
              {collapsed ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AICopilot;
