import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useDevice } from '../../../hooks/useDevice';
import { useAuth } from '../../../hooks/useAuth';
import type { MapPage } from '../hooks/useMapState';

interface PageShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onNavigate?: (page: MapPage) => void;
  currentPage?: MapPage;
  headerRight?: ReactNode;
  children: ReactNode;
}

const NAV_LINKS: { page: MapPage; icon: string; labelKey: string }[] = [
  { page: 'environmental', icon: '🌿', labelKey: 'map.environmental' },
  { page: 'compare',       icon: '⚖️', labelKey: 'map.compare'      },
  { page: 'export',        icon: '📥', labelKey: 'map.export'       },
];

export function PageShell({ title, subtitle, onClose, onNavigate, currentPage, headerRight, children }: PageShellProps) {
  const { t } = useTranslation();
  const { getRole } = useAuth();
  const { isMobile } = useDevice();
  const role = getRole();
  const visibleLinks = role === 'user' ? NAV_LINKS.filter(link => link.page !== 'export') : NAV_LINKS;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1001,
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
        borderBottom: '1px solid var(--border-normal)',
        background: 'var(--bg-surface)',
        flexShrink: 0, gap: '0.75rem',
      }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 700, color: 'var(--accent-green)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.1rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {headerRight}
          <button onClick={onClose}
            style={{ width: '32px', height: '32px', background: 'var(--bg-input)', border: '1px solid var(--border-normal)', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('map.close')}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* Links de navegação rápida entre páginas */}
      {onNavigate && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.4rem 1rem',
          borderBottom: '1px solid var(--border-normal)',
          overflowX: 'auto', flexShrink: 0,
          background: 'var(--bg-surface)',
        }}>
          <button onClick={onClose}
            style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'0.25rem 0.5rem', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'var(--text-secondary)', whiteSpace:'nowrap', flexShrink:0 }}>
            🗺️ {t('map.map')}
          </button>
          <span style={{ color:'var(--text-secondary)', fontSize:'0.7rem' }}>›</span>
          {visibleLinks.map((link, i) => (
            <span key={link.page} style={{ display:'flex', alignItems:'center', gap:'0.25rem', flexShrink:0 }}>
              {i > 0 && <span style={{ color:'var(--text-secondary)', fontSize:'0.7rem' }}>·</span>}
              <button onClick={() => onNavigate(link.page)}
                style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'0.25rem 0.5rem', background: currentPage === link.page ? 'rgba(0,230,118,0.12)' : 'transparent', border:'none', cursor:'pointer', fontSize:'0.72rem', color: currentPage === link.page ? 'var(--accent-green)' : 'var(--text-secondary)', borderRadius:'4px', whiteSpace:'nowrap', fontWeight: currentPage === link.page ? 600 : 400 }}>
                <span>{link.icon}</span> {t(link.labelKey)}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '0.6rem 1rem', borderTop: '1px solid var(--border-normal)', textAlign: 'center', background: 'var(--bg-surface)' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          {t('map.footer')}
        </span>
      </div>
    </div>
  );
}
