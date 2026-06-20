/**
 * AIIntelligencePanel — GaiaMind Digital Twin Earth
 * Country intelligence side panel with 8 tabs, streaming, ARIA, responsive layout.
 * Requirements: 6.3–6.8, 9.1–9.9
 */
import React, { useEffect, useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import { useCountryScore, useCountryForecast } from '../hooks/useDigitalTwinAPI';
import type { ForecastObject, ForecastScenario } from '../types/digitalTwin.types';

const CURRENT_YEAR = new Date().getFullYear();
const CK_TIMEOUT_MS = 30_000;
const CK_ACK_MS     = 2_000;

/** Property 9: is the forecast data stale? */
export function isForecastOutdated(generatedAt: string, today: Date): boolean {
  const generated = new Date(generatedAt);
  const diffDays  = (today.getTime() - generated.getTime()) / 86_400_000;
  return diffDays >= 91;
}

// ── Transition Probability Gauge ─────────────────────────────────────────────
function TransitionGauge({ probability }: { probability: number | null }) {
  if (probability === null) {
    return <span style={{ color: 'rgba(255,255,255,0.5)' }}>Unavailable</span>;
  }
  const pct = Math.round(probability * 100);
  const circumference = 2 * Math.PI * 30;
  const strokeDash = (pct / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="80" height="80" role="img" aria-label={`Transition probability ${pct}%`}>
        <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="30" fill="none"
          stroke="#3b82f6" strokeWidth="6"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
          {pct}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>10-year tier advance</span>
    </div>
  );
}

// ── Forecast Charts ───────────────────────────────────────────────────────────
function ForecastCharts({
  forecasts,
  scenario,
}: {
  forecasts: ForecastObject[];
  scenario: ForecastScenario;
}) {
  const filtered = forecasts.filter((f) => f.scenario === scenario);
  if (filtered.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', padding: 16 }}>
        Forecast unavailable for this country
      </div>
    );
  }

  const chartData = filtered.map((f) => ({
    year:            f.horizon_year,
    gaiamind:        f.indicators.gaiamind_score,
    gdp:             f.indicators.gdp_ppp / 1_000, // thousands
    hdi:             f.indicators.hdi,
    p5:              f.confidence_interval.p5,
    p95:             f.confidence_interval.p95,
  }));

  const today       = new Date();
  const anyOutdated = filtered.some((f) => isForecastOutdated(f.generated_at, today));

  return (
    <div>
      {anyOutdated && (
        <div
          role="alert"
          style={{
            background: '#f59e0b22',
            border: '1px solid #f59e0b',
            borderRadius: 6,
            padding: '6px 12px',
            color: '#f59e0b',
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          ⚠️ Forecast may be outdated
        </div>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: '#fff' }} />
          <YAxis yAxisId="left"  stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: '#fff' }} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: '#fff' }} />
          <Tooltip
            contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: 10, color: '#fff' }} />
          <Line yAxisId="left"  dataKey="gaiamind" name="GaiaMind" stroke="#3b82f6" dot={false} />
          <Line yAxisId="right" dataKey="hdi"       name="HDI"      stroke="#22c55e" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Streaming text section ────────────────────────────────────────────────────
function StreamingSection({ content, pending }: { content: string; pending: boolean }) {
  return (
    <div style={{ position: 'relative', minHeight: 40 }}>
      {pending && (
        <span
          aria-live="polite"
          aria-label="Generating content"
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#3b82f6',
            animation: 'pulse 1s infinite',
            marginRight: 8,
          }}
        />
      )}
      {content ? (
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>
          {content}
        </p>
      ) : pending ? (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Generating…</span>
      ) : (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Content temporarily unavailable</span>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function AIIntelligencePanel(): React.ReactElement {
  const selectedIso3  = useDigitalTwinStore((s) => s.selectedIso3);
  const selectCountry = digitalTwinStore.selectCountry;

  const isOpen = !!selectedIso3;

  const { data: score }     = useCountryScore(selectedIso3);
  const { data: forecasts } = useCountryForecast(selectedIso3);

  const [swotContent, setSwotContent]     = useState('');
  const [stratContent, setStratContent]   = useState('');
  const [swotPending, setSwotPending]     = useState(false);
  const [stratPending, setStratPending]   = useState(false);
  const [scenario, setScenario]           = useState<ForecastScenario>('Baseline');
  const [ckTimedOut, setCkTimedOut]       = useState(false);

  const ckTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ckAckRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request CognitiveKernel content when country is selected
  useEffect(() => {
    if (!selectedIso3) {
      setSwotContent('');
      setStratContent('');
      setSwotPending(false);
      setStratPending(false);
      setCkTimedOut(false);
      return;
    }

    setSwotPending(true);
    setStratPending(true);
    setCkTimedOut(false);

    const token = localStorage.getItem('auth_token') ?? '';
    const eventSource = new EventSource(
      `/api/chat?iso3=${selectedIso3}&mode=intelligence&token=${token}`
    );

    // 2-second ack window (Req 9.3)
    ckAckRef.current = setTimeout(() => {
      // Still pending — showing "Generating…" already via state
    }, CK_ACK_MS);

    // Hard timeout (Req 9.3)
    ckTimeoutRef.current = setTimeout(() => {
      setCkTimedOut(true);
      setSwotPending(false);
      setStratPending(false);
      eventSource.close();
    }, CK_TIMEOUT_MS);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.section === 'swot') {
          setSwotContent((p) => p + (data.token ?? ''));
          if (data.done) setSwotPending(false);
        } else if (data.section === 'strategy') {
          setStratContent((p) => p + (data.token ?? ''));
          if (data.done) setStratPending(false);
        }
      } catch { /* ignore */ }
    };

    eventSource.onerror = () => {
      setSwotPending(false);
      setStratPending(false);
      eventSource.close();
      if (ckTimeoutRef.current) clearTimeout(ckTimeoutRef.current);
    };

    return () => {
      eventSource.close();
      if (ckTimeoutRef.current) clearTimeout(ckTimeoutRef.current);
      if (ckAckRef.current) clearTimeout(ckAckRef.current);
    };
  }, [selectedIso3]);

  const handleClose = () => selectCountry(null);

  // Responsive: bottom sheet < 768px, right panel ≥ 768px
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '60vh', borderRadius: '12px 12px 0 0',
        overflowY: 'auto',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 400, borderRadius: 0,
        overflowY: 'auto',
      };

  if (!isOpen) return <></>;

  const countryName = score?.iso3 ?? selectedIso3 ?? '';
  const scoreVal    = score?.composite_score;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 9000 }}
        />
        <Dialog.Content
          aria-label={`Country intelligence panel — ${countryName}`}
          style={{
            ...panelStyle,
            background: 'rgba(8,12,25,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontFamily: '"Google Sans", sans-serif',
            zIndex: 9001,
          }}
          onEscapeKeyDown={handleClose}
          onInteractOutside={handleClose}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              gap: 12,
              position: 'sticky', top: 0,
              background: 'rgba(8,12,25,0.98)',
              zIndex: 1,
            }}
          >
            <div style={{ flex: 1 }}>
              <Dialog.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {countryName}
              </Dialog.Title>
              {selectedIso3 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {selectedIso3}
                  {scoreVal !== undefined && (
                    <span style={{ marginLeft: 8, color: '#3b82f6' }}>
                      GaiaMind: {scoreVal.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close country intelligence panel"
                onClick={handleClose}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  width: 28, height: 28,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root defaultValue="profile" style={{ flex: 1 }}>
            <Tabs.List
              aria-label="Country intelligence tabs"
              style={{
                display: 'flex',
                overflowX: 'auto',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '0 12px',
                gap: 2,
              }}
            >
              {[
                ['profile', 'Profile'],
                ['history', 'History'],
                ['status', 'Status'],
                ['swot', 'SWOT'],
                ['transition', 'Transition'],
                ['diagnosis', 'Diagnosis'],
                ['strategy', 'Strategy'],
                ['forecasts', 'Forecasts'],
              ].map(([value, label]) => (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  aria-label={label}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    padding: '10px 10px 8px',
                    cursor: 'pointer',
                    borderBottom: '2px solid transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div style={{ padding: '16px 20px' }}>
              {/* Country Profile */}
              <Tabs.Content value="profile" role="tabpanel" aria-label="Country Profile">
                {score ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {Object.entries(score.sub_scores).map(([k, v]) => (
                      <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                          {k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{(v as number).toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StreamingSection content="" pending />
                )}
              </Tabs.Content>

              {/* SWOT Analysis */}
              <Tabs.Content value="swot" role="tabpanel" aria-label="SWOT Analysis">
                {ckTimedOut ? (
                  <p style={{ color: '#ef4444', fontSize: 12 }}>Content temporarily unavailable</p>
                ) : (
                  <StreamingSection content={swotContent} pending={swotPending} />
                )}
              </Tabs.Content>

              {/* Transition Probability */}
              <Tabs.Content value="transition" role="tabpanel" aria-label="Transition Probability">
                <TransitionGauge probability={null} />
              </Tabs.Content>

              {/* Strategic Recommendations */}
              <Tabs.Content value="strategy" role="tabpanel" aria-label="Strategic Recommendations">
                {ckTimedOut ? (
                  <p style={{ color: '#ef4444', fontSize: 12 }}>Content temporarily unavailable</p>
                ) : (
                  <StreamingSection content={stratContent} pending={stratPending} />
                )}
              </Tabs.Content>

              {/* Forecasts */}
              <Tabs.Content value="forecasts" role="tabpanel" aria-label="Forecasts 2030–2050">
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {(['Baseline', 'Optimistic', 'Pessimistic'] as ForecastScenario[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScenario(s)}
                      aria-pressed={scenario === s}
                      aria-label={`${s} scenario`}
                      style={{
                        background: scenario === s ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        padding: '4px 12px',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {forecasts ? (
                  <ForecastCharts forecasts={forecasts} scenario={scenario} />
                ) : (
                  <StreamingSection content="" pending />
                )}
              </Tabs.Content>

              {/* Other tabs (History, Status, Diagnosis) */}
              {['history', 'status', 'diagnosis'].map((tab) => (
                <Tabs.Content
                  key={tab}
                  value={tab}
                  role="tabpanel"
                  aria-label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                >
                  <StreamingSection content="" pending={false} />
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AIIntelligencePanel;
