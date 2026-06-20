import { useState, useEffect } from 'react';
import type { MapPage } from './hooks/useMapState';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import i18n from '../../i18n';

interface MapNavBarProps {
  currentPage: MapPage;
  onNavigate: (page: MapPage) => void;
}

const NAV_ITEMS: { page: MapPage; icon: string; labelKey: string }[] = [
  { page: 'environmental', icon: '🌿', labelKey: 'map.environmental' },
  { page: 'compare',       icon: '⚖️', labelKey: 'map.compare'      },
  { page: 'export',        icon: '📥', labelKey: 'map.export'       },
];

// Relógio isolado — só este span re-renderiza a cada segundo
const RealTimeClock = () => {
  const [clock, setClock] = useState(() => {
    const now = new Date();
    const day = now.toLocaleDateString('pt-PT', { weekday: 'short' });
    const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${day.charAt(0).toUpperCase() + day.slice(1)} ${time}`;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const day = now.toLocaleDateString(i18n.language, { weekday: 'short' });
      const time = now.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setClock(`${day.charAt(0).toUpperCase() + day.slice(1)} ${time}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontSize: '0.72rem',
      color: 'rgba(0,230,118,0.7)',
      padding: '0.4rem 0.6rem',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.02em',
    }}>
      🕒 {clock}
    </span>
  );
};

export function MapNavBar({ currentPage, onNavigate }: MapNavBarProps) {
  const { t } = useTranslation();
  const { getRole } = useAuth();
  const role = getRole();
  const visibleItems = role === 'user' ? NAV_ITEMS.filter(item => item.page !== 'export') : NAV_ITEMS;

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      background: 'rgba(10,14,39,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,230,118,0.2)',
      borderRadius: '50px',
      padding: '0.35rem 0.5rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      {/* Relógio local */}
      <RealTimeClock />
      {visibleItems.map(item => {
        const isActive = currentPage === item.page;
        return (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            title={t(item.labelKey)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
              background: isActive ? 'rgba(0,230,118,0.2)' : 'transparent',
              color: isActive ? '#00E676' : 'rgba(224,247,250,0.65)',
              outline: isActive ? '1px solid rgba(0,230,118,0.4)' : 'none',
              minHeight: '36px',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            <span style={{ display: 'var(--nav-label-display, inline)' }}>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
