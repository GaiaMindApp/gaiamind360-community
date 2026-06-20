/**
 * Web Vitals Reporter — measures Core Web Vitals and sends to backend.
 * Metrics: FCP, LCP, CLS, INP, TTFB
 *
 * In development: logs to console.
 * In production: POST to /api/dashboard/vitals (if available).
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const IS_DEV = import.meta.env.DEV

function reportMetric(metric: Metric) {
  const entry = {
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,   // 'good' | 'needs-improvement' | 'poor'
    delta: Math.round(metric.delta),
  }

  if (IS_DEV) {
    const color = metric.rating === 'good' ? '#00E676' : metric.rating === 'needs-improvement' ? '#FFD54F' : '#f87171'
    console.log(`%c[WebVitals] ${entry.name}: ${entry.value}ms (${entry.rating})`, `color: ${color}; font-weight: bold`)
    return
  }

  // Production: fire-and-forget beacon to backend
  try {
    const token = (() => { try { return JSON.parse(localStorage.getItem('gaiamind-auth') || '{}').token } catch { return null } })()
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' })
      navigator.sendBeacon(`${BASE}/api/dashboard/vitals`, blob)
    }
  } catch { /* silent — vitals are non-critical */ }
}

export function initWebVitals() {
  onFCP(reportMetric)
  onLCP(reportMetric)
  onCLS(reportMetric)
  onINP(reportMetric)
  onTTFB(reportMetric)
}
