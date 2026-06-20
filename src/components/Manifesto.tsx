import { useEffect, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '../contexts/I18nContext';
import { ScrollArea } from './ui/scroll-area';
import { downloadManifestoPDF } from '../services/manifestoPDFService';
import { useDevice } from '../hooks/useDevice';
import '../styles/components.css';
import '../styles/print.css';

const sectionKeys = [
  'section_1',
  'section_2',
  'section_3',
  'section_4',
  'section_5',
  'section_6',
  'section_7',
  'section_8'
];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
}

export function Manifesto() {
  const { t, i18n } = useTranslation();
  useI18n();
  const { isMobile } = useDevice();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Skip particles on mobile — saves CPU/battery
    if (isMobile) return;
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: Math.random() > 0.5 ? '#00E676' : '#FFD54F',
      size: Math.random() * 4 + 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));
    setParticles(newParticles);
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + p.vx + 100) % 100,
        y: (p.y + p.vy + 100) % 100,
      })));
    }, 50);
    return () => clearInterval(interval);
  }, [isMobile]);

  return (
    <div className="component-container manifest-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: 0.4,
              borderRadius: '50%',
              filter: 'blur(4px)',
            }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '56rem', margin: '0 auto', padding: 'clamp(0.75rem, 4vw, 2rem)' }} data-manifesto-container>
        <div
          className="fade-up"
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 5vw, 3rem)', paddingTop: 'clamp(1rem, 3vw, 2rem)' }}
        >
          <Sparkles className="icon-responsive" style={{ color: '#00E676', margin: '0 auto 1rem' }} />
          <h1 style={{
            color: '#00E676',
            marginBottom: '0.75rem',
            fontSize: 'clamp(1.4rem, 5vw, 2.5rem)',
            lineHeight: 1.2,
            fontWeight: 700,
          }}>
            {t('manifesto.title')}
          </h1>
          <p style={{ color: 'rgba(224, 247, 250, 0.7)', fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', lineHeight: 1.6 }}>
            {t('manifesto.subtitle')}
          </p>
        </div>

        <ScrollArea style={{ height: isMobile ? 'auto' : '65vh', maxHeight: isMobile ? 'none' : '700px', paddingRight: isMobile ? '0' : '1rem' }} data-manifesto-content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 4vw, 3rem)' }}>
            {sectionKeys.map((key, i) => (
              <div
                key={key}
                className="fade-up"
                style={{ position: 'relative', paddingLeft: 'clamp(0.75rem, 2vw, 1.25rem)', animationDelay: `${i * 0.06}s` }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, width: '0.25rem', height: '100%', background: 'linear-gradient(to bottom, #00E676, transparent)', opacity: 0.5, borderRadius: '2px' }} />
                <h2 style={{
                  color: '#00E676',
                  marginBottom: '0.75rem',
                  fontSize: 'clamp(1rem, 3vw, 1.4rem)',
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}>
                  {t(`manifesto.${key}_title`)}
                </h2>
                <p style={{
                  color: 'rgba(224, 247, 250, 0.8)',
                  lineHeight: 1.75,
                  fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                  margin: 0,
                }}>
                  {t(`manifesto.${key}_content`)}
                </p>
              </div>
            ))}

            <div
              className="fade-up"
              style={{ textAlign: 'center', paddingTop: 'clamp(1.5rem, 4vw, 3rem)', borderTop: '1px solid rgba(0, 230, 118, 0.3)', animationDelay: '0.5s' }}
            >
              <p style={{ color: 'rgba(224, 247, 250, 1)', fontStyle: 'italic', marginBottom: '0.5rem', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', lineHeight: 1.6 }}>
                "{t('manifesto.quote')}"
              </p>
              <p style={{ color: '#00E676', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', fontWeight: 600 }}>
                {t('manifesto.quote_author')}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div
          className="fade-up"
          style={{ textAlign: 'center', marginTop: 'clamp(1.25rem, 3vw, 2rem)', animationDelay: '0.3s' }}
        >
          <button
            className="btn-responsive btn-primary"
            style={{ boxShadow: '0 0 30px rgba(0,230,118,0.3)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', padding: 'clamp(0.6rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.75rem)', minHeight: '44px' }}
            onClick={() => downloadManifestoPDF(i18n.language)}
          >
            <Download style={{ width: '1.1rem', height: '1.1rem', marginRight: '0.5rem', flexShrink: 0 }} />
            {t('manifesto.download_pdf')}
          </button>
          <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', marginTop: '0.875rem', lineHeight: 1.5 }}>
            {t('manifesto.share_message')}
          </p>
        </div>
      </div>
    </div>
  );
}
