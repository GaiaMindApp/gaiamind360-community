import { motion } from 'motion/react';
import { Shield, Eye, Heart, Lock, FileCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../hooks/useDevice';
import '../styles/components.css';

const principleKeys = [
  'principle_1',
  'principle_2',
  'principle_3',
  'principle_4',
  'principle_5',
  'principle_6'
];

interface SecurityProps {
  onNavigate?: (page: string) => void;
}

export function Security({ onNavigate }: SecurityProps) {
  const { t } = useTranslation();
  const { isMobile } = useDevice();

  const principles = principleKeys.map((key) => ({
    key,
    icon: [Eye, Lock, Heart, Users, FileCheck, Shield][principleKeys.indexOf(key)],
    title: t(`security.${key}_title`),
    description: t(`security.${key}_desc`),
    points: [
      t(`security.${key}_point_1`),
      t(`security.${key}_point_2`),
      t(`security.${key}_point_3`)
    ]
  }));

  const handleManifestoClick = () => {
    if (onNavigate) {
      onNavigate('manifesto');
    } else {
      window.location.hash = '#manifesto';
    }
  };

  return (
    <div className="component-container security-container">
      <div className="component-wrapper section">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)' }}
        >
          <h1 style={{ color: '#00E676', fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
            {t('security.title')}
          </h1>
          <p className="text-responsive-md" style={{ color: 'rgba(224, 247, 250, 0.7)', maxWidth: '42rem', margin: '0 auto', fontSize: 'clamp(0.875rem, 2.5vw, 1.05rem)', lineHeight: 1.6 }}>
            {t('security.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 'clamp(2rem, 5vw, 4rem)', position: 'relative' }}
        >
          <div style={{
            position: 'relative',
            height: isMobile ? '10rem' : '16rem',
            borderRadius: '1rem',
            overflow: 'hidden',
            background: 'linear-gradient(to bottom right, #003049, #001a2a)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0, 230, 118, 0.1)', filter: 'blur(3rem)' }}
            />
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
              <Shield className="icon-responsive" style={{ color: '#00E676', margin: '0 auto 1rem' }} />
              <h2 style={{ color: '#00E676', fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontWeight: 700 }}>{t('security.hero_title')}</h2>
            </div>
          </div>
        </motion.div>

        <div className="grid-2 mb-responsive">
          {principles.map((principle, i) => {
            const Icon = principle.icon;
            return (
              <motion.div
                key={principle.key}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="card-base">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(0, 230, 118, 0.2)', borderRadius: '0.5rem' }}>
                      <Icon style={{ width: '1.5rem', height: '1.5rem', color: '#00E676' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: 'rgba(224, 247, 250, 1)', marginBottom: '0.5rem', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 700 }}>{principle.title}</h3>
                      <p style={{ color: 'rgba(224, 247, 250, 0.7)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', marginBottom: '1rem', lineHeight: 1.6 }}>{principle.description}</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {principle.points.map((point) => (
                          <li key={point} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(224, 247, 250, 0.8)', fontSize: 'clamp(0.75rem, 1.8vw, 0.875rem)' }}>
                            <div style={{ width: '0.375rem', height: '0.375rem', flexShrink: 0, background: '#00E676', borderRadius: '50%' }} />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ textAlign: 'center' }}
        >
          <div className="card-base" style={{ background: 'linear-gradient(to bottom right, rgba(0, 48, 73, 0.6), rgba(0, 230, 118, 0.1))', borderColor: 'rgba(0, 230, 118, 0.5)' }}>
            <h2 style={{ color: '#00E676', marginBottom: '1rem', fontSize: 'clamp(1rem, 3vw, 1.4rem)', fontWeight: 700 }}>{t('security.manifesto_title')}</h2>
            <p style={{ color: 'rgba(224, 247, 250, 0.8)', marginBottom: '1.5rem', maxWidth: '42rem', margin: '0 auto 1.5rem', fontSize: 'clamp(0.85rem, 2vw, 1rem)', lineHeight: 1.6 }}>
              {t('security.manifesto_desc')}
            </p>
            <button 
              className="btn-responsive btn-primary"
              onClick={handleManifestoClick}
              style={{ cursor: 'pointer' }}
            >
              {t('security.read_manifesto')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
