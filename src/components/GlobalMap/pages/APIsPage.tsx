/**
 * APIsPage — redireccionado para Admin > External APIs
 * A gestão de APIs foi centralizada no painel Admin.
 */
import { ExternalLink } from 'lucide-react';
import { PageShell } from './PageShell';
import type { MapPage } from '../hooks/useMapState';

interface Props { onClose: () => void; onNavigate?: (page: MapPage) => void; currentPage?: MapPage; }

export function APIsPage({ onClose, onNavigate, currentPage }: Props) {
  return (
    <PageShell
      title="🔌 APIs"
      subtitle="Gestão centralizada no Admin"
      onClose={onClose}
      onNavigate={onNavigate}
      currentPage={currentPage}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', gap: '1rem', textAlign: 'center' }}>
        <ExternalLink style={{ width: 36, height: 36, color: '#00E676' }} />
        <h3 style={{ color: '#E0F7FA', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
          APIs movidas para o Admin
        </h3>
        <p style={{ color: 'rgba(224,247,250,0.5)', fontSize: '0.875rem', maxWidth: 300, margin: 0, lineHeight: 1.6 }}>
          O teste e monitorização das 9 APIs globais está agora em{' '}
          <strong style={{ color: '#00E676' }}>Admin → External APIs</strong>.
        </p>
      </div>
    </PageShell>
  );
}
