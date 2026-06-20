/**
 * Risk Table Semantic Classes Helper
 * Enterprise approach: Map data to semantic CSS classes
 */

export const TSI_CLASS_MAP: Record<string, string> = {
  'Highly Sustainable': 'tsi-highly-sustainable',
  'Approaching Sustainable': 'tsi-approaching-sustainable',
  'Transitioning': 'tsi-transitioning',
  'At Risk': 'tsi-at-risk',
  'Unsustainable': 'tsi-unsustainable',
};

export const RISK_LEVEL_CLASS_MAP: Record<string, string> = {
  'CRITICAL': 'risk-critical',
  'HIGH': 'risk-high',
  'WATCHLIST': 'risk-watchlist',
  'MEDIUM': 'risk-medium',
  'LOW': 'risk-low',
};

export const RISK_DOT_CLASS_MAP: Record<string, string> = {
  'CRITICAL': 'risk-dot-critical',
  'HIGH': 'risk-dot-high',
  'WATCHLIST': 'risk-dot-watchlist',
  'MEDIUM': 'risk-dot-medium',
  'LOW': 'risk-dot-low',
};

/**
 * Get TSI classification CSS class
 */
export function getTsiClass(classification: string): string {
  return TSI_CLASS_MAP[classification] || '';
}

/**
 * Get risk level CSS class
 */
export function getRiskLevelClass(level: string): string {
  return RISK_LEVEL_CLASS_MAP[level] || '';
}

/**
 * Get risk dot CSS class
 */
export function getRiskDotClass(level: string): string {
  return RISK_DOT_CLASS_MAP[level] || '';
}

/**
 * Get TSI color (theme-aware — reads current mode from html.light class)
 * Prefer getTsiClass() for new code; use this only for Recharts/canvas contexts.
 */
export function getTsiColor(classification: string): string {
  const isLight = document.documentElement.classList.contains('light');

  const darkMap: Record<string, string> = {
    'Highly Sustainable':     '#00E676',
    'Approaching Sustainable': '#4FC3F7',
    'Transitioning':           '#FFD54F',
    'At Risk':                 '#FF8C42',
    'Unsustainable':           '#f87171',
  };
  const lightMap: Record<string, string> = {
    'Highly Sustainable':     '#057A55',
    'Approaching Sustainable': '#1D4ED8',
    'Transitioning':           '#D97706',
    'At Risk':                 '#EA580C',
    'Unsustainable':           '#DC2626',
  };

  const map = isLight ? lightMap : darkMap;
  return map[classification] || (isLight ? '#64748B' : '#94a3b8');
}

/**
 * Get risk level color (theme-aware)
 * Prefer getRiskLevelClass() for new code; use this only for Recharts/canvas contexts.
 */
export function getRiskLevelColor(level: string): string {
  const isLight = document.documentElement.classList.contains('light');

  const darkMap: Record<string, string> = {
    'CRITICAL':  '#f87171',
    'HIGH':      '#FF4444',
    'WATCHLIST': '#FF8C42',
    'MEDIUM':    '#FFD54F',
    'LOW':       '#00E676',
  };
  const lightMap: Record<string, string> = {
    'CRITICAL':  '#DC2626',
    'HIGH':      '#DC2626',
    'WATCHLIST': '#EA580C',
    'MEDIUM':    '#D97706',
    'LOW':       '#057A55',
  };

  const map = isLight ? lightMap : darkMap;
  return map[level] || (isLight ? '#057A55' : '#00E676');
}
