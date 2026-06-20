﻿import { motion, AnimatePresence } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CountryOutlookPanel } from './CountryOutlookPanel'
import { CountryAnalysisPanel } from './CountryAnalysisPanel'
import { PolicySimulatorPanel } from './PolicySimulatorPanel'
import { ScenarioExplorer } from './ScenarioExplorer'
import { CustomScenarioBuilder } from './CustomScenarioBuilder'
import { useDevice } from '../hooks/useDevice'
import { useDashboardContext } from '../contexts/DashboardContext'
import '../styles/components.css'
import '../styles/insights.css'

const PAGES = [
  { id: 'overview',  labelKey: 'insights.pages.overview.label',  shortKey: 'insights.pages.overview.short' },
  { id: 'country',   labelKey: 'insights.pages.country.label',   shortKey: 'insights.pages.country.short' },
  { id: 'simulator', labelKey: 'insights.pages.simulator.label', shortKey: 'insights.pages.simulator.short' },
  { id: 'scenario',  labelKey: 'insights.pages.scenario.label',  shortKey: 'insights.pages.scenario.short' },
  { id: 'custom',    labelKey: 'insights.pages.custom.label',    shortKey: 'insights.pages.custom.short' },
] as const

const VERDICTS = ['CRITICAL', 'AT_RISK', 'LIKELY_DECLINE', 'STABLE', 'IMPROVING_AT_RISK', 'LIKELY_IMPROVE'] as const
const TIERS    = [1, 2, 3, 4] as const

type InsightPage = (typeof PAGES)[number]['id']
type VerdictType = (typeof VERDICTS)[number]
type TierType    = (typeof TIERS)[number]

function fadeUp(delay = 0) {
  return { initial: { y: 30, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, duration: 0.5 } }
}

function SectionHeader({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="h2-section-header">
      {tag && <span className="h2-section-tag">{tag}</span>}
      <h2 className="h2-section-title">{title}</h2>
      <div className="h2-section-line" />
    </div>
  )
}

export function Insights() {
  const { isDesktop } = useDevice()
  const { t } = useTranslation()
  const { setDashboardState } = useDashboardContext()
  const [activePage, setActivePage]       = useState<InsightPage>('overview')
  const [verdictFilter, setVerdictFilter] = useState<VerdictType[]>([...VERDICTS])
  const [tierFilter, setTierFilter]       = useState<TierType[]>([...TIERS])
  const [filtersOpen, setFiltersOpen]     = useState(false)

  const selectedPage = useMemo(
    () => PAGES.find((p) => p.id === activePage) ?? PAGES[0],
    [activePage],
  )

  const handlePageChange = (page: InsightPage) => {
    setActivePage(page)
    setDashboardState({ view: `insights_${page}` })
  }

  const toggleVerdict = (v: VerdictType) =>
    setVerdictFilter((cur) => cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])

  const toggleTier = (t: TierType) =>
    setTierFilter((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])

  const activeFiltersCount =
    (verdictFilter.length < VERDICTS.length ? VERDICTS.length - verdictFilter.length : 0) +
    (tierFilter.length < TIERS.length ? TIERS.length - tierFilter.length : 0)

  return (
    <div className="insights-container component-container">

      <motion.section className="h2-section ins-hero" {...fadeUp(0.1)}>
        <div className="h2-system-badge">
          <span className="h2-system-badge-dot" />
          {t('insights.hero.liveLabel')}
        </div>
        <h1 className="h2-hero-title">
          {t('insights.hero.brand')} <span>{t('insights.hero.product')}</span>
        </h1>
        <p className="h2-hero-subtitle">
          {t('insights.hero.subtitle')}
        </p>
      </motion.section>

      <div className="h2-divider" />

      {!isDesktop && (
        <div className="ins-mobile-nav">
          <div className="ins-mobile-tabs">
            {PAGES.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => handlePageChange(page.id)}
                className={`ins-mobile-tab${activePage === page.id ? ' ins-mobile-tab--active' : ''}`}
              >
                {t(page.shortKey)}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`ins-filter-toggle${filtersOpen ? ' ins-filter-toggle--open' : ''}${activeFiltersCount > 0 ? ' ins-filter-toggle--active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            {t('insights.mobile.filters')}
            {activeFiltersCount > 0 && <span className="ins-filter-badge">{activeFiltersCount}</span>}
          </button>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                className="ins-mobile-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ins-mobile-filter-section">
                  <span className="ins-mobile-filter-label">{t('insights.mobile.verdict')}</span>
                  <div className="ins-mobile-filter-chips">
                    {VERDICTS.map((v) => (
                      <button key={v} type="button"
                        onClick={() => toggleVerdict(v)}
                        className={`ins-filter-btn${verdictFilter.includes(v) ? ' ins-filter-btn--active' : ''}`}>
                        {t(`insights.verdict.${v}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ins-mobile-filter-section">
                  <span className="ins-mobile-filter-label">{t('insights.mobile.tier')}</span>
                  <div className="ins-mobile-filter-chips ins-mobile-filter-chips--tier">
                    {TIERS.map((tier) => (
                      <button key={tier} type="button"
                        onClick={() => toggleTier(tier)}
                        className={`ins-filter-btn${tierFilter.includes(tier) ? ' ins-filter-btn--active' : ''}`}>
                        {t('insights.mobile.tierLabel', { tier })}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="ins-layout">

        {isDesktop && (
          <motion.aside className="ins-sidebar" {...fadeUp(0.15)}>
            <section className="ins-sidebar-section">
              <SectionHeader tag={t('insights.sidebar.viewsTag')} title={t('insights.sidebar.viewsTitle')} />
              <div className="ins-nav-grid">
                {PAGES.map((page) => (
                  <button key={page.id} type="button"
                    onClick={() => handlePageChange(page.id)}
                    className={`ins-nav-btn${activePage === page.id ? ' ins-nav-btn--active' : ''}`}>
                    {t(page.labelKey)}
                  </button>
                ))}
              </div>
            </section>

            <div className="h2-divider" />

            <section className="ins-sidebar-section">
              <SectionHeader tag={t('insights.sidebar.filtersTag')} title={t('insights.sidebar.verdictTitle')} />
              <div className="ins-filter-grid">
                {VERDICTS.map((verdict) => (
                  <button key={verdict} type="button"
                    onClick={() => toggleVerdict(verdict)}
                    className={`ins-filter-btn${verdictFilter.includes(verdict) ? ' ins-filter-btn--active' : ''}`}>
                    {t(`insights.verdict.${verdict}`)}
                  </button>
                ))}
              </div>
            </section>

            <div className="h2-divider" />

            <section className="ins-sidebar-section">
              <SectionHeader tag={t('insights.sidebar.filtersTag')} title={t('insights.sidebar.tierTitle')} />
              <div className="ins-filter-grid ins-filter-grid--tier">
                {TIERS.map((tier) => (
                  <button key={tier} type="button"
                    onClick={() => toggleTier(tier)}
                    className={`ins-filter-btn${tierFilter.includes(tier) ? ' ins-filter-btn--active' : ''}`}>
                    {t('insights.sidebar.tierLabel', { tier })}
                  </button>
                ))}
              </div>
            </section>
          </motion.aside>
        )}

        <motion.main className="ins-content" {...fadeUp(0.2)}>
          <section className="h2-section">
            <SectionHeader tag="" title={t(selectedPage.labelKey)} />
            <div className="ins-page-body">
              {activePage === 'overview' && (
                <CountryOutlookPanel
                  verdictFilter={verdictFilter}
                  tierFilter={tierFilter}
                  onVerdictFilterChange={setVerdictFilter}
                  onTierFilterChange={setTierFilter}
                />
              )}
              {activePage === 'country'   && <CountryAnalysisPanel verdictFilter={verdictFilter} tierFilter={tierFilter} />}
              {activePage === 'simulator' && <PolicySimulatorPanel />}
              {activePage === 'scenario'  && <ScenarioExplorer />}
              {activePage === 'custom'    && <CustomScenarioBuilder />}
            </div>
          </section>
        </motion.main>
      </div>
    </div>
  )
}
