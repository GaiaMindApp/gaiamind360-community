import { useState, lazy, Suspense } from 'react'
import './App.css'
import './styles/app-layout.css'
import './styles/responsive.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthModal } from './components/AuthModal'
import { useAuth } from './hooks/useAuth'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { I18nProvider, useI18n } from './contexts/I18nContext'
import { DashboardProvider } from './contexts/DashboardContext'
import { QueryProvider } from './contexts/QueryProvider'
import { useDevice } from './hooks/useDevice'
import { OAuthCallback } from './components/OAuthCallback'

// ── Lazy-loaded pages — each becomes a separate chunk ────────────────────────
const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })))
const GaiaMindDynamicChatFixed = lazy(() => import('./components/GaiaMindDynamicChatFixed'))
const GlobalMap = lazy(() => import('./components/GlobalMap').then(m => ({ default: m.GlobalMap })))
const Insights = lazy(() => import('./components/Insights').then(m => ({ default: m.Insights })))
const Security = lazy(() => import('./components/Security').then(m => ({ default: m.Security })))
const Manifesto = lazy(() => import('./components/Manifesto').then(m => ({ default: m.Manifesto })))
const Research = lazy(() => import('./components/Research').then(m => ({ default: m.Research })))
const Admin = lazy(() => import('./components/Admin'))
const Collaboration = lazy(() => import('./components/Collaboration').then(m => ({ default: m.Collaboration })))
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })))
const ServiceMonitor = lazy(() => import('./components/ServiceMonitor').then(m => ({ default: m.ServiceMonitor })))
const OwnerAnalyticsDashboard = lazy(() => import('./components/OwnerAnalyticsDashboard').then(m => ({ default: m.OwnerAnalyticsDashboard })))
const SecurityDashboard = lazy(() => import('./components/SecurityDashboard').then(m => ({ default: m.SecurityDashboard })))

type Page = 'home' | 'chat' | 'map' | 'insights' | 'security' | 'manifesto' | 'research' | 'admin' | 'collaboration' | 'settings' | 'analytics' | 'monitor' | 'sec-dashboard'

function AppContent() {
  const { isAuthenticated, user, logout, getRole } = useAuth()
  // Interceptar /oauth/callback antes de qualquer outra coisa
  if (window.location.pathname === '/oauth/callback') {
    return <OAuthCallback />
  }
  const { t } = useTranslation()
  const { currentLanguage } = useI18n()
  const role = getRole()
  const [showAuth, setShowAuth] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { isMobile } = useDevice()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  if (isAuthenticated) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <span className="header-brand">GaiaMind</span>
          </div>
        </header>

        <div className="app-layout">
          {/* Overlay escuro — cobre TODO o conteúdo quando sidebar está aberta no mobile */}
          {isMobile && sidebarOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`} data-lang={currentLanguage}>
            {/* Cabeçalho interno — só visível em mobile, garante que Home é acessível */}
            {isMobile && (
              <div className="sidebar-mobile-header">
                <span>Menu</span>
                <button
                  className="sidebar-mobile-close"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Fechar menu"
                >
                  ×
                </button>
              </div>
            )}
            <nav
              className="sidebar-nav"
              tabIndex={0}
              aria-label="Navegação principal"
            >
              {(() => {
                const allItems = [
                  { id: 'home',          label: t('sidebar.home'),          page: 'home',          roles: ['user','analyst','owner'] },
                  { id: 'chat',          label: t('sidebar.chat'),          page: 'chat',          roles: ['user','analyst','owner'] },
                  { id: 'map',           label: t('sidebar.map'),           page: 'map',           roles: ['user','analyst','owner'] },
                  { id: 'divider1',      label: '',                         isDivider: true },
                  { id: 'insights',      label: t('sidebar.insights'),      page: 'insights',      roles: ['user','analyst','owner'] },
                  { id: 'research',      label: t('sidebar.research'),      page: 'research',      roles: ['analyst','owner'] },
                  { id: 'divider2',      label: '',                         isDivider: true },
                  { id: 'manifesto',     label: t('sidebar.manifesto'),     page: 'manifesto',     roles: ['user','analyst','owner'] },
                  { id: 'security',      label: t('sidebar.security'),      page: 'security',      roles: ['user','analyst','owner'] },
                  { id: 'divider3',      label: '',                         isDivider: true },
                  { id: 'collaboration', label: t('sidebar.collaboration'), page: 'collaboration', roles: ['user','analyst','owner'] },
                  { id: 'divider4',      label: '',                         isDivider: true },
                  { id: 'analytics',     label: t('sidebar.analytics'),     page: 'analytics',     roles: ['owner'] },
                  { id: 'monitor',       label: t('sidebar.monitor'),       page: 'monitor',       roles: ['owner'] },
                  { id: 'admin',         label: t('sidebar.admin'),         page: 'admin',         roles: ['owner'] },
                  { id: 'divider5',      label: '',                         isDivider: true },
                  { id: 'settings',      label: t('sidebar.settings'),      page: 'settings',      roles: ['user','analyst','owner'] },
                  { id: 'divider-logout', label: '', isDivider: true },
                  { id: 'logout',        label: `🚪 ${t('auth.logout')}`,  page: '__logout__',    roles: ['user','analyst','owner'] },
                ];

                // 1. Filtrar por role
                const filtered = allItems.filter(item =>
                  item.isDivider || (item.roles || []).includes(role)
                );

                // 2. Remover dividers duplicados, no início e no fim
                const clean = filtered.filter((item, idx, arr) => {
                  if (!item.isDivider) return true;
                  const prev = arr[idx - 1];
                  const next = arr[idx + 1];
                  if (!prev || !next) return false;           // início ou fim
                  if (prev.isDivider) return false;           // consecutivo
                  return true;
                });

                return clean.map(item =>
                  item.isDivider ? (
                    <div key={item.id} className="sidebar-divider" />
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.page === '__logout__') { logout(); return; }
                        setCurrentPage(item.page as Page); if (isMobile) setSidebarOpen(false);
                      }}
                      className={`sidebar-item ${currentPage === item.page ? 'active' : ''} ${item.page === '__logout__' ? 'sidebar-item-logout' : ''}`}
                    >
                      {item.label}
                    </button>
                  )
                );
              })()}
            </nav>
          </aside>

          <main className="app-main">
            <Suspense fallback={<div className="page-loading-skeleton" />}>
              <ErrorBoundary>{currentPage === 'home' && <Home />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'chat' && <GaiaMindDynamicChatFixed />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'map' && <GlobalMap />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'insights' && <Insights />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'research' && (role === 'analyst' || role === 'owner') && <Research />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'manifesto' && <Manifesto />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'security' && (role === 'owner' ? <SecurityDashboard /> : <Security onNavigate={setCurrentPage} />)}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'admin' && role === 'owner' && <Admin />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'analytics' && role === 'owner' && <OwnerAnalyticsDashboard />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'monitor' && role === 'owner' && <ServiceMonitor />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'collaboration' && <Collaboration />}</ErrorBoundary>
              <ErrorBoundary>{currentPage === 'settings' && <Settings />}</ErrorBoundary>
            </Suspense>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="logo-section">
          <div className="logo">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" fill="#1abc9c"/>
              <path d="M30 15L35 25H25L30 15Z" fill="white"/>
              <path d="M25 30L30 40L35 30" fill="white"/>
            </svg>
          </div>
          <h1 className="logo-text">GaiaMind</h1>
        </div>
        <div className="main-content">
          <h2 className="title">{t('landing.title')}</h2>
          <p className="subtitle">{t('landing.subtitle')}</p>
          <p className="description">{t('landing.description')}</p>
        </div>
        <button className="cta-button" onClick={() => setShowAuth(true)}>{t('landing.cta')}</button>
      </div>
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  )
}

function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <DashboardProvider>
          <AppContent />
        </DashboardProvider>
      </I18nProvider>
    </QueryProvider>
  )
}

export default App
