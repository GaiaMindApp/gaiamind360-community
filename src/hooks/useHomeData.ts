import { useQuery } from '@tanstack/react-query'
import { authFetch } from '../services/authFetch'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface HomeData {
  co2: number | null
  co2ppm: number | null
  renewableEnergy: number | null
  biodiversity: number | null
  temperature: number | null
  gaiaScore: number | null
  modelsRunning: number
  datasetsAnalyzed: number
  countriesMonitored: number
  lastUpdate: string
  riskMap: { country: string; code: string; score: number; risk: string; barColor: string; alertLevel: string; co2Current?: number }[]
  insights: { type: 'ANOMALY' | 'RISK' | 'POSITIVE'; title: string; body: string; region: string; confidence: number }[]
  research: { type: string; title: string; meta: string }[]
  feed: { time: string; text: string; dotColor: string; tag: string; tagStyle: React.CSSProperties }[]
  loading: boolean
  error: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALERT_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, WATCHLIST: 2, MEDIUM: 3, LOW: 4 }

function alertColor(alertLevel: string): string {
  const map: Record<string, string> = {
    CRITICAL: '#FF2222', HIGH: '#FF4444', WATCHLIST: '#FF8C42',
    MEDIUM: '#FFD54F', LOW: '#00E676',
  }
  return map[alertLevel] ?? '#00E676'
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── BFF fetcher ──────────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<HomeData> {
  const now = new Date()

  // Try BFF first (single request)
  let bffData: any = null
  try {
    const res = await authFetch(`${BASE}/api/dashboard?lang=en`, { signal: AbortSignal.timeout(15000) })
    if (res.ok) bffData = await res.json()
  } catch { /* fallback below */ }

  // ── Parse BFF response ─────────────────────────────────────────────────
  if (bffData) {
    return parseBffResponse(bffData, now)
  }

  // ── Fallback: individual requests (backwards compatible) ───────────────
  return fallbackFetch(now)
}

function parseBffResponse(data: any, now: Date): HomeData {
  const countries = data.countries ?? []
  const telemetry = data.telemetry ?? {}
  const predictions = data.predictions ?? []
  const wbData = data.worldbank ?? {}
  const connectivity = data.connectivity

  // Risk Map
  const sorted = [...countries].sort((a: any, b: any) => {
    const ao = ALERT_ORDER[a.alert_level] ?? 5
    const bo = ALERT_ORDER[b.alert_level] ?? 5
    if (ao !== bo) return ao - bo
    return (b.severe_prob ?? 0) - (a.severe_prob ?? 0)
  })
  const riskMap = sorted.map((c: any) => ({
    country: c.country || c.code,
    code: c.code || '',
    score: Math.round(c.score_current ?? 0),
    alertLevel: c.alert_level || 'LOW',
    risk: c.alert_level || 'LOW',
    barColor: alertColor(c.alert_level || 'LOW'),
  }))

  // Gaia Score
  const allScores = countries
    .map((c: any) => c.score_current)
    .filter((v: any) => v != null && !isNaN(Number(v)))
    .map(Number)
  const gaiaScore = allScores.length
    ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
    : null

  // World Bank KPIs
  const validWb = Object.values(wbData).filter((v: any) => v?.data)
  const avg = (key: string) => {
    const vals = validWb
      .map((r: any) => (r as any).data[key]?.value)
      .filter((v: any) => v != null && !isNaN(Number(v)))
      .map(Number)
    return vals.length ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)) : null
  }
  const co2 = avg('co2_emissions')
  const renewableEnergy = avg('renewable_energy')
  const forestArea = avg('forest_area')
  const datasetsAnalyzed = Math.max(validWb.length * 5, 15)

  // Insights from predictions
  let insights: HomeData['insights'] = []
  if (Array.isArray(predictions) && predictions.length > 0) {
    insights = predictions.slice(0, 3).map((p: any) => {
      const safeCountry = String(p.country ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' }[c]!))
      const pctLabel = p.pct_change != null
        ? `${p.pct_change > 0 ? '+' : ''}${Number(p.pct_change).toFixed(1)}%`
        : p.trend ?? '—'
      return {
        type: (p.insight_type ?? (p.trend === 'increase' ? 'RISK' : 'POSITIVE')) as 'RISK' | 'POSITIVE',
        title: `CO₂ Forecast — ${safeCountry}`,
        body: `Actual: ${p.co2_current?.toFixed(1) ?? '—'}t → Predicted: ${p.co2_next_pred?.toFixed(1) ?? '—'}t per capita (${pctLabel})`,
        region: safeCountry,
        confidence: p.display_confidence ?? Math.round((p.directional_confidence ?? 0.5) * 100),
      }
    })
  }
  if (insights.length === 0) {
    if (renewableEnergy) {
      insights.push({
        type: 'POSITIVE',
        title: 'Renewable Energy Progress',
        body: `Average renewable energy share: ${renewableEnergy.toFixed(1)}% across ${validWb.length} monitored countries (World Bank API).`,
        region: 'Global',
        confidence: 95,
      })
    }
  }

  // Research
  let research: HomeData['research'] = []
  if (connectivity?.results?.length) {
    research = connectivity.results.map((api: any) => ({
      type: api.success ? '✅ Online' : '❌ Offline',
      title: api.name,
      meta: `Real-time data · ${api.success ? 'Connected' : 'Unavailable'}`,
    }))
  }
  if (research.length === 0) {
    research = [
      { type: 'AI Model', title: 'GaiaMind Intelligence Engine', meta: '216+ models · 732 indicators · 227 countries' },
      { type: 'Risk Analysis', title: 'Sustainability Risk Assessment', meta: '5-layer analysis · 228 countries · Accuracy 88.5%' },
      { type: 'Climate Data', title: 'Atmospheric CO₂ Monitoring', meta: 'Daily measurements · NOAA Mauna Loa · Real-time' },
      { type: 'Economic Data', title: 'World Bank Indicators', meta: '1,400+ indicators · 217 countries · Official data' },
    ]
  }

  // Feed
  const feed: HomeData['feed'] = []
  if (countries.length > 0) {
    feed.push({
      time: fmtTime(now),
      text: `Analysis updated — ${countries.length} countries monitored`,
      dotColor: '#00E676', tag: 'UPDATE',
      tagStyle: { color: '#00E676', background: 'rgba(0,230,118,0.1)' },
    })
  }
  if (validWb.length > 0) {
    feed.push({
      time: fmtTime(new Date(now.getTime() - 10 * 60000)),
      text: `Economic data refreshed — ${validWb.length} countries · ${datasetsAnalyzed} indicators`,
      dotColor: '#4FC3F7', tag: 'WORLD BANK',
      tagStyle: { color: '#4FC3F7', background: 'rgba(79,195,247,0.1)' },
    })
  }
  if (feed.length === 0) {
    feed.push({
      time: fmtTime(now),
      text: 'GaiaMind systems operational — pipeline data loaded',
      dotColor: '#00E676', tag: 'SYSTEM',
      tagStyle: { color: '#00E676', background: 'rgba(0,230,118,0.1)' },
    })
  }

  return {
    co2,
    co2ppm: null,
    renewableEnergy,
    biodiversity: forestArea,
    temperature: null,
    gaiaScore,
    modelsRunning: telemetry?.models ?? 29,
    datasetsAnalyzed: telemetry?.indicators ?? 757,
    countriesMonitored: telemetry?.countries ?? (countries.length || 228),
    lastUpdate: fmtTime(now),
    riskMap,
    insights: insights.slice(0, 3),
    research: research.slice(0, 6),
    feed,
    loading: false,
    error: null,
  }
}

// ── Fallback (original 12-request approach) ──────────────────────────────────

async function fallbackFetch(now: Date): Promise<HomeData> {
  // Import the original logic dynamically to keep this file lean
  const { useHomeDataLegacy } = await import('./useHomeDataLegacy')
  return useHomeDataLegacy()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHomeData(): HomeData {
  const { data, isLoading, error } = useQuery<HomeData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 5 * 60 * 1000,        // 5 min fresh
    refetchInterval: 5 * 60 * 1000,   // auto-refresh every 5 min
  })

  if (isLoading || !data) {
    return {
      co2: null, co2ppm: null, renewableEnergy: null, biodiversity: null, temperature: null,
      gaiaScore: null, modelsRunning: 29, datasetsAnalyzed: 757, countriesMonitored: 228,
      lastUpdate: '—', riskMap: [], insights: [], research: [], feed: [],
      loading: true, error: null,
    }
  }

  if (error) {
    return {
      ...data,
      loading: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  return data
}
