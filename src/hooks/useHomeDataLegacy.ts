/**
 * Legacy fallback — original 12-request fetch logic.
 * Used only when BFF /api/dashboard is unreachable.
 */
import type { HomeData } from './useHomeData'
import { authFetch } from '../services/authFetch'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const ALERT_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, WATCHLIST: 2, MEDIUM: 3, LOW: 4 }

function alertColor(level: string): string {
  return ({ CRITICAL: '#FF2222', HIGH: '#FF4444', WATCHLIST: '#FF8C42', MEDIUM: '#FFD54F', LOW: '#00E676' })[level] ?? '#00E676'
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function safeAuthFetch(url: string, timeoutMs = 15000): Promise<any> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await authFetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

const SAMPLE_COUNTRIES = ['USA', 'CHN', 'DEU', 'BRA', 'IND', 'NOR']

export async function useHomeDataLegacy(): Promise<HomeData> {
  const now = new Date()

  const [insightsCountries, telemetry, predictions, ...wbData] = await Promise.all([
    safeAuthFetch(`${BASE}/api/insights/countries`),
    safeAuthFetch(`${BASE}/api/insights/telemetry`),
    safeAuthFetch(`${BASE}/api/global-data/ml/predictions/co2`),
    ...SAMPLE_COUNTRIES.map(c => safeAuthFetch(`${BASE}/api/global-data/worldbank/${c}`)),
  ])

  // Risk Map
  let riskMap: HomeData['riskMap'] = []
  let gaiaScore: number | null = null
  if (Array.isArray(insightsCountries) && insightsCountries.length > 0) {
    const sorted = [...insightsCountries].sort((a, b) => {
      const ao = ALERT_ORDER[a.alert_level] ?? 5
      const bo = ALERT_ORDER[b.alert_level] ?? 5
      return ao !== bo ? ao - bo : (b.severe_prob ?? 0) - (a.severe_prob ?? 0)
    })
    riskMap = sorted.map((c: any) => ({
      country: c.country || c.code,
      code: c.code || '',
      score: Math.round(c.score_current ?? 0),
      alertLevel: c.alert_level || 'LOW',
      risk: c.alert_level || 'LOW',
      barColor: alertColor(c.alert_level || 'LOW'),
    }))
    const allScores = insightsCountries
      .map((c: any) => c.score_current)
      .filter((v: any) => v != null && !isNaN(Number(v)))
      .map(Number)
    gaiaScore = allScores.length
      ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
      : null
  }

  // World Bank
  const validWb = wbData.filter((v: any) => v?.data)
  const avg = (key: string) => {
    const vals = validWb.map((r: any) => r.data[key]?.value).filter((v: any) => v != null && !isNaN(Number(v))).map(Number)
    return vals.length ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)) : null
  }

  // Insights
  let insights: HomeData['insights'] = []
  if (Array.isArray(predictions) && predictions.length > 0) {
    insights = predictions.slice(0, 3).map((p: any) => ({
      type: (p.insight_type ?? (p.trend === 'increase' ? 'RISK' : 'POSITIVE')) as 'RISK' | 'POSITIVE',
      title: `CO₂ Forecast — ${p.country ?? ''}`,
      body: `${p.co2_current?.toFixed(1) ?? '—'}t → ${p.co2_next_pred?.toFixed(1) ?? '—'}t`,
      region: p.country ?? 'Global',
      confidence: p.display_confidence ?? 50,
    }))
  }

  const feed: HomeData['feed'] = [{
    time: fmtTime(now),
    text: 'GaiaMind systems operational',
    dotColor: '#00E676', tag: 'SYSTEM',
    tagStyle: { color: '#00E676', background: 'rgba(0,230,118,0.1)' },
  }]

  return {
    co2: avg('co2_emissions'),
    co2ppm: null,
    renewableEnergy: avg('renewable_energy'),
    biodiversity: avg('forest_area'),
    temperature: null,
    gaiaScore,
    modelsRunning: telemetry?.models ?? 29,
    datasetsAnalyzed: telemetry?.indicators ?? 757,
    countriesMonitored: telemetry?.countries ?? (Array.isArray(insightsCountries) ? insightsCountries.length : 228),
    lastUpdate: fmtTime(now),
    riskMap,
    insights: insights.slice(0, 3),
    research: [
      { type: 'AI Model', title: 'GaiaMind Intelligence Engine', meta: '216+ models · 732 indicators' },
      { type: 'Climate Data', title: 'Atmospheric CO₂ Monitoring', meta: 'NOAA Mauna Loa · Real-time' },
    ],
    feed,
    loading: false,
    error: null,
  }
}
