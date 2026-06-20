import React, { createContext, useContext, useState } from 'react'

interface DashboardContextState {
  view: string | null        // ex: 'insights_overview', 'insights_country', 'insights_simulator'
  country?: string           // país selecionado
  countryCode?: string
  verdict?: string
  score?: number
  extra?: string             // texto adicional livre
}

interface DashboardContextType {
  dashboardState: DashboardContextState | null
  setDashboardState: (state: DashboardContextState | null) => void
  buildContextString: () => string | undefined
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [dashboardState, setDashboardState] = useState<DashboardContextState | null>(null)

  const buildContextString = (): string | undefined => {
    if (!dashboardState) return undefined
    const parts: string[] = []

    if (dashboardState.view === 'insights_overview') {
      parts.push('User is viewing the Global Insights Overview — 228 countries monitored across environmental, social and governance indicators.')
    } else if (dashboardState.view === 'insights_country') {
      parts.push('User is viewing the Country Analysis panel in Insights.')
    } else if (dashboardState.view === 'insights_simulator') {
      parts.push('User is viewing the Policy Simulator (PPO vs Greedy vs Random strategies).')
    } else if (dashboardState.view === 'insights_scenario') {
      parts.push('User is viewing the Scenario Engine.')
    } else if (dashboardState.view === 'insights_custom') {
      parts.push('User is viewing the Custom Scenario Builder.')
    }

    if (dashboardState.country) {
      parts.push(`Selected country: ${dashboardState.country}${dashboardState.countryCode ? ` (${dashboardState.countryCode})` : ''}.`)
    }
    if (dashboardState.verdict) {
      parts.push(`Current verdict: ${dashboardState.verdict}.`)
    }
    if (dashboardState.score !== undefined) {
      parts.push(`Outlook score: ${dashboardState.score.toFixed(3)}.`)
    }
    if (dashboardState.extra) {
      parts.push(dashboardState.extra)
    }

    return parts.length > 0 ? parts.join(' ') : undefined
  }

  return (
    <DashboardContext.Provider value={{ dashboardState, setDashboardState, buildContextString }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboardContext must be used within DashboardProvider')
  return ctx
}
