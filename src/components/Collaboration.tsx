import { motion } from 'motion/react';
import { Building2, Send, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import '../styles/components.css';
import { authFetch } from '../services/authFetch';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const partnerUrls = {
  un: 'https://sdgs.un.org/goals',
  nasa: 'https://earthdata.nasa.gov',
  google_earth: 'https://earthengine.google.com',
  ipcc: 'https://www.ipcc.ch',
  world_bank: 'https://data.worldbank.org',
  wwf: 'https://www.worldwildlife.org'
};

const partnerKeys = ['un', 'nasa', 'google_earth', 'ipcc', 'world_bank', 'wwf'];
const partnerLogos = ['🌍', '🚀', '🗺️', '🌡️', '🏦', '🐼'];
const partnerNames = ['ONU', 'NASA', 'Google Earth Engine', 'IPCC', 'World Bank', 'WWF'];

export function Collaboration() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ full_name: '', email: '', organization: '', position: '', purpose: '' });
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleEndpoint = (ep: string) =>
    setSelectedEndpoints(prev => prev.includes(ep) ? prev.filter(x => x !== ep) : [...prev, ep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.purpose) return;
    setStatus('loading');
    try {
      const res = await authFetch(`${API_BASE}/api/collaboration/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endpoints: selectedEndpoints }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');
      setStatus('success');
      setForm({ full_name: '', email: '', organization: '', position: '', purpose: '' });
      setSelectedEndpoints([]);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const partners = partnerKeys.map((key, i) => ({
    key,
    name: partnerNames[i],
    logo: partnerLogos[i],
    description: t(`collaboration.partners.${key}`),
    url: partnerUrls[key as keyof typeof partnerUrls]
  }));

  const endpoints = [
    { key: 'climate_data', label: t('collaboration.endpoint_climate') },
    { key: 'biodiversity', label: t('collaboration.endpoint_biodiversity') },
    { key: 'emissions', label: t('collaboration.endpoint_emissions') },
    { key: 'predictions', label: t('collaboration.endpoint_predictions') },
    { key: 'satellite', label: t('collaboration.endpoint_satellite') },
    { key: 'ocean', label: t('collaboration.endpoint_ocean') },
  ];

  return (
    <div className="component-container collaboration-container">
      <div className="component-wrapper section">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}
        >
          <h1 style={{ color: '#00E676', fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', fontWeight: 700, marginBottom: '0.75rem' }}>{t('collaboration.title')}</h1>
          <p className="text-responsive-md" style={{ color: 'rgba(224, 247, 250, 0.7)', fontSize: 'clamp(0.875rem, 2.5vw, 1.05rem)', lineHeight: 1.6 }}>{t('collaboration.subtitle')}</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-responsive"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'clamp(1rem, 3vw, 1.5rem)', flexWrap: 'wrap' }}>
            <Building2 className="icon-responsive" style={{ color: '#00E676' }} />
            <h2 style={{ color: '#00E676', fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 600 }}>{t('collaboration.global_partners')}</h2>
          </div>
          <div className="grid-3">
            {partners.map((partner, i) => (
              <motion.div
                key={partner.key}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="partner-card"
                  title={t('collaboration.open_official_site')}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget;
                    card.style.transform = 'translateY(-8px)';
                    card.style.boxShadow = '0 12px 24px rgba(0, 230, 118, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget;
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <div className="card-base" style={{ height: '100%' }}>
                    <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', marginBottom: '0.75rem' }}>{partner.logo}</div>
                    <h3 style={{ color: 'rgba(224, 247, 250, 1)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', fontWeight: 600, flexWrap: 'wrap' }}>
                      {partner.name}
                      <ExternalLink style={{ width: '0.875rem', height: '0.875rem', color: '#00E676', opacity: 0.7, flexShrink: 0 }} />
                    </h3>
                    <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: 'clamp(0.78rem, 1.8vw, 0.875rem)', lineHeight: 1.5 }}>{partner.description}</p>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-base mb-responsive">
            <h2 style={{ color: '#00E676', marginBottom: 'clamp(1rem, 3vw, 1.5rem)', fontSize: 'clamp(1rem, 3vw, 1.3rem)', fontWeight: 700 }}>{t('collaboration.api_access')}</h2>

            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: 'clamp(1rem, 4vw, 2rem)', color: '#00E676' }}>
                <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', marginBottom: '1rem' }}>✅</div>
                <p style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 600 }}>{t('collaboration.success_title')}</p>
                <p style={{ color: 'rgba(224,247,250,0.6)', marginTop: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)' }}>{t('collaboration.success_subtitle')}</p>
                <button className="btn-responsive btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => setStatus('idle')}>{t('collaboration.new_request')}</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="grid-2">
                  <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.full_name')} *</label>
                  <input name="full_name" value={form.full_name} onChange={handleChange} required className="input-responsive" placeholder={t('collaboration.full_name_placeholder')} />
                </div>
                <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.email')} *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="input-responsive" placeholder={t('collaboration.email_placeholder')} />
                </div>
                </div>

                <div className="grid-2">
                  <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.organization')}</label>
                  <input name="organization" value={form.organization} onChange={handleChange} className="input-responsive" placeholder={t('collaboration.organization_placeholder')} />
                </div>
                <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.position')}</label>
                  <input name="position" value={form.position} onChange={handleChange} className="input-responsive" placeholder={t('collaboration.position_placeholder')} />
                </div>
                </div>

                <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.use_purpose')} *</label>
                  <textarea name="purpose" value={form.purpose} onChange={handleChange} required className="input-responsive" style={{ minHeight: 'clamp(80px, 15vw, 120px)', resize: 'vertical' }} placeholder={t('collaboration.use_purpose_placeholder')} />
                </div>

                <div>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.75rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('collaboration.endpoints_interest')}</label>
                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    {endpoints.map((endpoint) => (
                      <label key={endpoint.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(224, 247, 250, 0.8)', cursor: 'pointer', minHeight: '44px' }}>
                        <input type="checkbox" checked={selectedEndpoints.includes(endpoint.key)} onChange={() => toggleEndpoint(endpoint.key)} style={{ borderRadius: '0.25rem', width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ fontSize: 'clamp(0.78rem, 1.8vw, 0.875rem)' }}>{endpoint.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {status === 'error' && (
                <p style={{ color: '#ff5252', fontSize: 'clamp(0.78rem, 2vw, 0.875rem)' }}>❌ {errorMsg || t('collaboration.error_default')}</p>
                )}

                <button type="submit" disabled={status === 'loading'} className="btn-responsive btn-primary" style={{ width: '100%', opacity: status === 'loading' ? 0.7 : 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', flexShrink: 0 }} />
                  {status === 'loading' ? t('collaboration.sending') : t('collaboration.request_collaboration')}
                </button>
              </form>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <div className="card-base" style={{ display: 'inline-block', maxWidth: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: 'rgba(224, 247, 250, 1)', marginBottom: '0.75rem', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              {t('collaboration.has_access')}
            </p>
            <button className="btn-responsive btn-secondary">
              {t('collaboration.access_documentation')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
