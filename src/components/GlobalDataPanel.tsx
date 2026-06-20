import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../services/authFetch';

interface GlobalDataPanelProps {
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  onClose: () => void;
}

export const GlobalDataPanel: React.FC<GlobalDataPanelProps> = ({ countryCode, countryName, lat, lon, onClose }) => {
  const { t } = useTranslation();
  const [wbData, setWbData]     = useState<any>(null);
  const [sdgData, setSdgData]   = useState<any>(null);
  const [nasaData, setNasaData] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'nasa'|'worldbank'|'unep'|'ai'>('nasa');
  const [aiData, setAiData]     = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

useEffect(() => {
    setLoading(true);
    setWbData(null); setSdgData(null); setNasaData(null);
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    Promise.all([
      authFetch(`${base}/api/global-data/worldbank/${countryCode}`).then(r => r.ok ? r.json() : null),
      authFetch(`${base}/api/global-data/sdg/country/${countryCode}`).then(r => r.ok ? r.json() : null),
      authFetch(`${base}/api/global-data/nasa/power?lat=${lat}&lon=${lon}`).then(r => r.ok ? r.json() : null),
    ]).then(([wb, sdg, nasa]) => {
      setWbData(wb); setSdgData(sdg); setNasaData(nasa);
      setAiData(null);
      setLoading(false);
    });
  }, [countryCode, lat, lon]);

  const card = (color: string, title: string, value: string, sub: string, source: string) => (
    <div style={{ background:'var(--bg-input)', borderRadius:'8px', padding:'16px', border:`1px solid ${color}44` }}>
      <div style={{ color, fontSize:'12px', marginBottom:'6px', fontWeight:500 }}>{title}</div>
      <div style={{ color:'var(--text-primary)', fontSize:'20px', fontWeight:'bold', marginBottom:'4px' }}>{value}</div>
      <div style={{ color:'var(--text-secondary)', fontSize:'11px' }}>{sub}</div>
      <div style={{ color:'var(--text-tertiary, #4b5563)', fontSize:'10px', marginTop:'4px' }}>{t('gdp.source')}: {source}</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding:'32px', textAlign:'center', color:'var(--accent-green)' }}>{t('gdp.loading')}</div>
  );

  const wb  = wbData?.data || {};
  const sdg = sdgData?.indicators || {};
  const nasa = nasaData || {};

  return (
    <div className="global-data-panel" style={{ background:'var(--bg-surface)', color:'var(--text-primary)', borderRadius:'12px' }}>
      <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(34,197,94,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <Globe style={{ color:'var(--accent-green)', width:'22px', height:'22px' }} />
          <span style={{ fontSize:'18px', fontWeight:'bold', color:'var(--accent-green)' }}>{t('gdp.title')} — {countryName}</span>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-tertiary, #9ca3af)', cursor:'pointer', fontSize:'20px' }}>✕</button>
      </div>

      <div style={{ padding:'12px 24px', borderBottom:'1px solid rgba(34,197,94,0.1)', display:'flex', gap:'8px' }}>
        {(['nasa','worldbank','unep','ai'] as const).map(tabId => (
          <button key={tabId} onClick={() => {
            setTab(tabId);
            if (tabId === 'ai' && !aiData && !aiLoading) {
              setAiLoading(true);
              const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
              const safeCode = (countryCode && countryCode !== 'XX') ? countryCode : (countryName ?? '').substring(0, 2).toUpperCase() || 'XX';
              authFetch(`${base}/api/explain/country-data`, {
                method: 'POST',
                body: JSON.stringify({
                  country: countryName,
                  country_code: safeCode,
                  nasa: nasaData && !nasaData.error ? nasaData : null,
                  world_bank: wbData?.data && Object.keys(wbData.data).length > 0 ? wbData.data : null,
                  sdg: sdgData?.indicators && Object.keys(sdgData.indicators).length > 0 ? sdgData.indicators : null,
                })
              }).then(r => r.ok ? r.json() : null)
                .then(d => { setAiData(d); setAiLoading(false); })
                .catch(() => setAiLoading(false));
            }
          }} style={{
            padding:'7px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:500, fontSize:'13px',
            background: tab === tabId ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
            color: tab === tabId ? '#000' : 'var(--text-tertiary, #9ca3af)'
          }}>
            {tabId === 'nasa' ? `🛰️ NASA` : tabId === 'worldbank' ? `🏦 World Bank` : tabId === 'unep' ? `🌍 ${t('gdp.unep_tab')}` : `🧠 GaiaMind AI`}
          </button>
        ))}
      </div>

      <div style={{ padding:'24px' }}>
        {tab === 'nasa' && (
          <div>
            <div style={{ color:'var(--accent-green)', marginBottom:'16px', fontWeight:600 }}>
              🛰️ NASA POWER — {t('gdp.nasa_title')}
              {nasa.date && <span style={{ color:'var(--text-secondary)', fontSize:'12px', marginLeft:'8px' }}>({nasa.date.toString().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')} · {t('gdp.nasa_lag')})</span>}
            </div>
            {nasa.error ? (
              <p style={{ color:'var(--error-color, #f87171)' }}>{t('gdp.nasa_unavailable')}: {nasa.error}</p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'12px' }}>
                {nasa.temperature_avg != null && card('#60a5fa',t('gdp.temp_avg'),`${nasa.temperature_avg}°C`,`${t('gdp.temp_max')} ${nasa.temperature_max}°C / ${t('gdp.temp_min')} ${nasa.temperature_min}°C`,'NASA POWER')}
                {nasa.precipitation_mm != null && card('#34d399',t('gdp.precipitation'),`${nasa.precipitation_mm} mm/${t('gdp.day')}`,t('gdp.daily_rain'),'NASA POWER')}
                {nasa.solar_radiation_wm2 != null && card('#fbbf24',t('gdp.solar'),`${nasa.solar_radiation_wm2} W/m²`,t('gdp.surface'),'NASA POWER')}
                {nasa.wind_speed_ms != null && card('#a78bfa',t('map.wind'),`${nasa.wind_speed_ms} m/s`,t('gdp.wind_alt'),'NASA POWER')}
                <div style={{ background:'var(--bg-input)', borderRadius:'8px', padding:'16px', border:'1px solid var(--border-normal)' }}>
                  <div style={{ color:'var(--text-tertiary, #9ca3af)', fontSize:'12px', marginBottom:'6px' }}>{t('map.coordinates')}</div>
                  <div style={{ color:'var(--text-primary)', fontSize:'14px', fontFamily:'monospace' }}>{lat.toFixed(4)}°, {lon.toFixed(4)}°</div>
                  <div style={{ color:'var(--text-tertiary, #4b5563)', fontSize:'10px', marginTop:'4px' }}>{t('gdp.source')}: NASA POWER API</div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'worldbank' && (
          <div>
            <div style={{ color:'var(--accent-green)', marginBottom:'16px', fontWeight:600 }}>🏦 World Bank — {t('gdp.wb_title')}</div>
            {Object.keys(wb).length === 0 ? (
              <p style={{ color:'var(--text-secondary)' }}>{t('gdp.no_data')}</p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'12px' }}>
                {wb.population    && card('#c084fc',t('map.population_total'),Number(wb.population.value).toLocaleString(),`${t('gdp.year')}: ${wb.population.year}`,'World Bank')}
                {wb.gdp_per_capita && card('#facc15',t('map.gdp'),`$${Number(wb.gdp_per_capita.value).toLocaleString(undefined,{maximumFractionDigits:0})}`,`${t('gdp.year')}: ${wb.gdp_per_capita.year}`,'World Bank')}
                {wb.co2_emissions  && card('#f87171',t('gdp.co2_capita'),`${Number(wb.co2_emissions.value).toFixed(2)} t`,`${t('gdp.year')}: ${wb.co2_emissions.year}`,'World Bank')}
                {wb.renewable_energy && card('#4ade80',t('map.renewable'),`${Number(wb.renewable_energy.value).toFixed(1)}%`,`${t('gdp.year')}: ${wb.renewable_energy.year}`,'World Bank')}
                {wb.forest_area    && card('#86efac',t('map.forest'),`${Number(wb.forest_area.value).toFixed(1)}%`,`${t('gdp.year')}: ${wb.forest_area.year}`,'World Bank')}
              </div>
            )}
          </div>
        )}

        {tab === 'unep' && (
          <div>
            <div style={{ color:'var(--accent-green)', marginBottom:'16px', fontWeight:600 }}>🌍 {t('gdp.unep_title')}</div>
            {Object.keys(sdg).length === 0 ? (
              <p style={{ color:'var(--text-secondary)' }}>{t('gdp.no_sdg_data')}</p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'12px' }}>
                {sdg.ghg_emissions  && card('#fb923c',t('gdp.ghg'),`${Number(sdg.ghg_emissions.value).toFixed(1)} ${sdg.ghg_emissions.unit}`,`${t('gdp.year')}: ${sdg.ghg_emissions.year}`,sdg.ghg_emissions.source)}
                {sdg.forest_area    && card('#4ade80',t('gdp.sdg_forest'),`${Number(sdg.forest_area.value).toFixed(1)}%`,`${t('gdp.year')}: ${sdg.forest_area.year}`,sdg.forest_area.source)}
                {sdg.renewable_energy && card('#fbbf24',t('gdp.sdg_renewable'),`${Number(sdg.renewable_energy.value).toFixed(1)}%`,`${t('gdp.year')}: ${sdg.renewable_energy.year}`,sdg.renewable_energy.source)}
              </div>
            )}
            <div style={{ marginTop:'16px', padding:'12px', background:'var(--bg-input)', borderRadius:'8px', fontSize:'12px', color:'var(--text-secondary)' }}>
              {t('gdp.unep_footer')}
            </div>
          </div>
        )}
        {tab === 'ai' && (
          <div>
            {aiLoading && <p style={{ color:'var(--text-secondary)' }}>{t('gdp.ai_loading')}</p>}
            {!aiLoading && !aiData && <p style={{ color:'var(--text-secondary)' }}>{t('gdp.ai_waiting')}</p>}
            {aiData && (
              <div style={{ background:'var(--bg-input)', borderRadius:'8px', padding:'20px', lineHeight:1.7, color:'var(--text-secondary)', fontSize:'14px' }}>
                {aiData.summary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
