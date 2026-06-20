import { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind, Zap, Leaf, TrendingUp, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlobalAPIsService } from '../../../services/globalAPIsService';
import { fetchNRTData, type NRTMetric } from '../../../services/environmentalNRTService';
import { PageShell } from './PageShell';

import type { MapPage } from '../hooks/useMapState';
import { authFetch } from '../../../services/authFetch';

interface Props { onClose: () => void; onNavigate?: (page: MapPage) => void; currentPage?: MapPage; }

export function EnvironmentalPage({ onClose, onNavigate, currentPage }: Props) {
  const { t } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const mergeNRT = (base: any, nrt: NRTMetric | undefined) => {
    if (!nrt || nrt.source === 'static_reference') return base;
    return {
      ...base,
      ...(nrt.current ? { current: nrt.current } : {}),
      ...(nrt.regions?.length ? { regions: nrt.regions } : {}),
      ...(nrt.details?.length ? { details: nrt.details } : {}),
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const [nrtData] = await Promise.all([fetchNRTData()]);
      let tempValue = 15.2, tempDate = '';
      try {
        const r = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/global-data/nasa/power?lat=0&lon=0`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) { const d = await r.json(); if (d.temperature_avg != null) { tempValue = d.temperature_avg; tempDate = d.date || ''; } }
      } catch {}

      const countries = ['BRA','USA','DEU','NOR','CHN','IND','FRA','ZAF'];
      const labels: Record<string,string> = { BRA:'Brasil',USA:'EUA',DEU:'Alemanha',NOR:'Noruega',CHN:'China',IND:'India',FRA:'França',ZAF:'África do Sul' };
      const energyResults: { name: string; value: number }[] = [];
      await Promise.all(countries.map(async code => {
        try {
          const d = await GlobalAPIsService.getWorldBankData(code);
          const val = d?.data?.renewable_energy?.value;
          const year = d?.data?.renewable_energy?.year;
          if (val != null) energyResults.push({ name: labels[code] + ' (' + year + ')', value: val });
        } catch {}
      }));
      const avgRenewable = energyResults.length > 0 ? energyResults.reduce((s,e) => s+e.value,0)/energyResults.length : 29.1;
      const def = getDefaults(t);
      setData({
        ...def,
        temperature: { ...def.temperature, current: tempValue.toFixed(1)+'°C',
          details: [
            { label: t('env.equatorial_temp'), value: tempValue.toFixed(1)+'°C', change: tempDate ? 'Data: '+tempDate : 'NASA POWER' },
            { label: t('gdp.source'), value: 'NASA POWER API', change: 'Satelital' },
            { label: t('env.global_anomaly'), value: '+1.1°C', change: t('env.since_1880') },
            { label: t('env.forecast_2030'), value: '+1.5°C', change: 'IPCC AR6' },
          ]
        },
        energy: { ...def.energy, current: avgRenewable.toFixed(1)+'%',
          regions: energyResults.slice(0,4).map(e => ({ name: e.name, value: e.value.toFixed(1)+'%', change: e.value>=50?'+sustentável':e.value>=30?'~médio':'-baixo' })),
          details: [
            { label: t('env.real_avg'), value: avgRenewable.toFixed(1)+'%', change: energyResults.length+' '+t('env.countries') },
            { label: t('gdp.source'), value: 'World Bank API', change: 'Oficial' },
          ]
        },
        humidity:   mergeNRT(def.humidity,   nrtData?.humidity),
        airQuality: mergeNRT(def.airQuality,  nrtData?.air_quality),
        oceans:     mergeNRT(def.oceans,      nrtData?.oceans),
        forests:    mergeNRT(def.forests,     nrtData?.forests),
        fires: {
          title: t('env.metric_fires') || '🔥 Incêndios Activos',
          icon: Thermometer,
          current: nrtData?.fires?.current || 'N/A',
          trend: 'NASA FIRMS · 24h',
          status: (nrtData?.fires?.total_fires || 0) > 5000 ? t('env.status_critical') : t('env.status_moderate'),
          regions: nrtData?.fires?.regions || [],
          details: nrtData?.fires?.details || [{ label: 'Source', value: 'NASA FIRMS', change: 'offline' }],
          source: nrtData?.fires?.source || 'static_reference',
        },
        energyCarbon: {
          title: t('env.metric_energy_carbon') || '⚡ Carbon Intensity',
          icon: Zap,
          current: nrtData?.energy_carbon?.current || 'N/A',
          trend: 'Open-Meteo + OWID · live',
          status: t('env.status_normal'),
          regions: nrtData?.energy_carbon?.regions || [],
          details: nrtData?.energy_carbon?.details || [{ label: 'Source', value: 'Open-Meteo + OWID', change: 'offline' }],
          source: nrtData?.energy_carbon?.source || 'static_reference',
        },
      });
    } catch {
      setError('Usando dados de referência');
      setData(getDefaults(t));
    } finally { setLoading(false); }
  };

  const METRICS = [
    { id: 'temperature', icon: Thermometer, badge: 'REAL',   badgeColor: '#4ade80' },
    { id: 'humidity',    icon: Droplets,    badge: 'NRT',    badgeColor: '#60a5fa' },
    { id: 'airQuality',  icon: Wind,        badge: 'NRT',    badgeColor: '#60a5fa' },
    { id: 'energy',      icon: Zap,         badge: 'REAL',   badgeColor: '#4ade80' },
    { id: 'oceans',      icon: Droplets,    badge: 'NRT',    badgeColor: '#60a5fa' },
    { id: 'forests',     icon: Leaf,        badge: 'NRT',    badgeColor: '#60a5fa' },
    { id: 'fires',       icon: Thermometer, badge: 'NRT',    badgeColor: '#f97316' },
    { id: 'energyCarbon',icon: Zap,         badge: 'NRT',    badgeColor: '#60a5fa' },
  ];

  const title = selectedMetric && data ? (data[selectedMetric]?.title || selectedMetric) : t('env.title');
  const subtitle = selectedMetric ? t('env.category_details') : t('env.realtime_monitoring');

  const backBtn = selectedMetric ? (
    <button onClick={() => setSelectedMetric(null)}
      style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.4rem 0.75rem', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(224,247,250,0.8)', cursor:'pointer', fontSize:'0.8rem' }}>
      <ArrowLeft style={{ width:'14px', height:'14px' }} /> {t('env.back')}
    </button>
  ) : null;

  return (
    <PageShell title={`🌿 ${title}`} subtitle={subtitle} onClose={onClose} onNavigate={onNavigate} currentPage={currentPage} headerRight={backBtn}>
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem', gap:'1rem' }}>
          <Loader2 style={{ width:'2.5rem', height:'2.5rem', color:'#00E676', animation:'spin 1s linear infinite' }} />
          <p style={{ color:'rgba(224,247,250,0.6)', fontSize:'0.875rem' }}>{t('env.loading_title')}</p>
        </div>
      ) : !data ? null : selectedMetric === null ? (
        /* ── GRID DE CATEGORIAS ── */
        <div>
          {error && <div style={{ marginBottom:'1rem', padding:'0.75rem', background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:'8px', color:'#fbbf24', fontSize:'0.8rem', textAlign:'center' }}>{error}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.75rem' }}>
            {METRICS.map(m => {
              const Icon = m.icon;
              const d = data[m.id];
              if (!d) return null;
              const statusColor = d.status === t('env.status_critical') ? '#ef4444' : d.status === t('env.status_moderate') ? '#eab308' : '#22c55e';
              // badge dinâmico baseado no source real
              const src = (d.source || '').toLowerCase();
              const isStatic = src === 'static_reference' || src === 'static' || src === '';
              const isCached = src === 'cached';
              const dynBadge = isStatic ? 'STATIC' : isCached ? 'CACHED' : m.badge;
              const dynColor = isStatic ? '#9ca3af' : isCached ? '#eab308' : m.badgeColor;
              return (
                <button key={m.id} onClick={() => setSelectedMetric(m.id)}
                  className="card-base"
                  style={{ cursor:'pointer', textAlign:'center', padding:'0.75rem 0.5rem', position:'relative', border:'1px solid rgba(0,230,118,0.2)' }}>
                  <div style={{ position:'absolute', top:'0.3rem', right:'0.3rem', padding:'0.1rem 0.3rem', borderRadius:'3px', fontSize:'0.55rem', fontWeight:700, background:`${dynColor}20`, color:dynColor }}>
                    {dynBadge}
                  </div>
                  <div style={{ width:'2rem', height:'2rem', borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 0.5rem' }}>
                    <Icon style={{ width:'1rem', height:'1rem', color:'#E0F7FA' }} />
                  </div>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#E0F7FA', marginBottom:'0.2rem', lineHeight:1.2 }}>{d.title}</div>
                  <div style={{ fontSize:'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight:800, color:'#00E676', marginBottom:'0.2rem' }}>{d.current}</div>
                  <div style={{ fontSize:'0.62rem', color:'rgba(224,247,250,0.45)', marginBottom:'0.35rem', lineHeight:1.3 }}>{d.trend}</div>
                  {d.status && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.25rem' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:statusColor, flexShrink:0 }} />
                      <span style={{ fontSize:'0.62rem', color:statusColor, fontWeight:600 }}>{d.status}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── DETALHE DA CATEGORIA ── */
        <MetricDetail data={data[selectedMetric]} metricId={selectedMetric} t={t} onBack={() => setSelectedMetric(null)} />
      )}
    </PageShell>
  );
}

function MetricDetail({ data, metricId, t, onBack }: { data: any; metricId: string; t: any; onBack: () => void }) {
  const Icon = data.icon;
  const statusColor = data.status === t('env.status_critical') ? '#ef4444' : data.status === t('env.status_moderate') ? '#eab308' : '#22c55e';

  const sourceMap: Record<string, string[]> = {
    temperature:  ['NASA POWER API (satelital)', 'Temperatura média equatorial', 'IPCC AR6 projeções'],
    energy:       ['World Bank API — EG.FEC.RNEW.ZS', 'Dados oficiais por país', 'Média de 8 países'],
    humidity:     ['Open-Meteo ERA5 (Copernicus CDS)', 'Precipitação e vapor de água', 'Média global 6 pontos'],
    airQuality:   ['OpenAQ v3 API', 'PM2.5/PM10: rede de sensores', 'NO₂/O₃: Copernicus CAMS'],
    oceans:       ['Open-Meteo Marine / Copernicus CMEMS', 'NOAA CO-OPS nível do mar', 'pH 8.1 — NOAA ref (estático)'],
    forests:      ['Global Forest Watch (Hansen/UMD)', 'Desflorestação anual', 'Espécies ameaçadas'],
    fires:        ['NASA FIRMS VIIRS Suomi NPP', 'Focos activos · resolução 375m', 'Actualização a cada poucas horas'],
    energyCarbon: ['Electricity Maps API', 'Carbon intensity por zona eléctrica', 'gCO₂/kWh em tempo real'],
  };

  return (
    <div>
      <div style={{ marginBottom:'1rem' }}>
        <button onClick={onBack}
          style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.45rem 0.9rem', background:'rgba(0,230,118,0.12)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:'999px', color:'#00E676', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>
          <ArrowLeft style={{ width:'14px', height:'14px' }} /> {t('env.back')}
        </button>
      </div>
      {/* Header da métrica */}
      <div className="insights-card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:'1 1 auto', minWidth:0 }}>
            <div style={{ width:'2.5rem', height:'2.5rem', borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon style={{ width:'1.25rem', height:'1.25rem', color:'#E0F7FA' }} />
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'clamp(0.85rem, 2vw, 1rem)', fontWeight:700, color:'#E0F7FA' }}>{data.title}</div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', marginTop:'0.2rem' }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:statusColor, flexShrink:0 }} />
                <span style={{ fontSize:'0.68rem', color:statusColor }}>{data.status}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'1.5rem', flexShrink:0 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(1.25rem, 4vw, 1.75rem)', fontWeight:800, color:'#00E676', lineHeight:1 }}>{data.current}</div>
              <div style={{ fontSize:'0.65rem', color:'rgba(224,247,250,0.5)' }}>{t('env.current_value')}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                <TrendingUp style={{ width:'12px', height:'12px', color:'rgba(224,247,250,0.5)', flexShrink:0 }} />
                <span style={{ fontSize:'clamp(0.7rem, 1.5vw, 0.8rem)', color:'#E0F7FA' }}>{data.trend}</span>
              </div>
              <div style={{ fontSize:'0.65rem', color:'rgba(224,247,250,0.4)' }}>{t('env.trend')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Regiões + Detalhes */}
      <div className="grid-2" style={{ gap:'1rem', marginBottom:'1rem' }}>
        {/* Regiões */}
        <div className="insights-card">
          <h4 className="insights-card-title" style={{ marginBottom:'0.75rem' }}>
            <BarChart3 style={{ width:'1rem', height:'1rem' }} /> {t('env.regional_data')}
          </h4>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {data.regions?.map((r: any) => (
              <div key={r.name} className="card-base" style={{ padding:'0.75rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#E0F7FA' }}>{r.name}</div>
                  <div style={{ fontSize:'1rem', fontWeight:700, color:'#4FC3F7' }}>{r.value}</div>
                </div>
                <div style={{ padding:'0.2rem 0.5rem', borderRadius:'4px', fontSize:'0.72rem', fontWeight:600,
                  background: r.change.startsWith('+') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  color: r.change.startsWith('+') ? '#f87171' : '#4ade80' }}>
                  {r.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métricas detalhadas */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="insights-card">
            <h4 className="insights-card-title" style={{ marginBottom:'0.75rem' }}>
              <BarChart3 style={{ width:'1rem', height:'1rem' }} /> {t('env.detailed_metrics')}
            </h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
              {data.details?.map((d: any, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 0.75rem', background:'rgba(0,48,73,0.4)', borderRadius:'6px' }}>
                  <div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(224,247,250,0.6)' }}>{d.label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:700, color:'#4FC3F7' }}>{d.value}</div>
                  </div>
                  <div style={{ padding:'0.15rem 0.4rem', borderRadius:'4px', fontSize:'0.68rem',
                    background: d.change.startsWith('+') ? 'rgba(239,68,68,0.15)' : d.change.startsWith('-') ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                    color: d.change.startsWith('+') ? '#f87171' : d.change.startsWith('-') ? '#4ade80' : '#60a5fa' }}>
                    {d.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fonte */}
          <div className="insights-card" style={{ borderColor:'rgba(34,197,94,0.3)' }}>
            <h4 style={{ fontSize:'0.75rem', fontWeight:600, color:'#4ade80', marginBottom:'0.5rem' }}>{t('env.data_source')}</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              {(sourceMap[metricId] || []).map((s, i) => (
                <div key={i} style={{ fontSize:'0.72rem', color:'rgba(224,247,250,0.7)', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                  <span style={{ color:'#4ade80' }}>•</span> {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaults(t: any) {
  return {
    temperature: { title: t('env.metric_temperature'), icon: Thermometer, current: '15.2°C', trend: t('env.temp_trend'), status: t('env.status_critical'),
      regions: [{ name: t('env.region_arctic'), value: '-10.5°C', change: '+2.3°C' }, { name: t('env.region_europe'), value: '9.8°C', change: '+1.8°C' }, { name: t('env.region_africa'), value: '25.1°C', change: '+0.9°C' }, { name: t('env.region_asia'), value: '12.4°C', change: '+1.2°C' }],
      details: [{ label: t('env.ocean_temp'), value: '16.1°C', change: '+0.6°C' }, { label: t('env.land_temp'), value: '14.8°C', change: '+1.4°C' }, { label: t('env.global_anomaly'), value: '+1.1°C', change: t('env.since_1880') }, { label: t('env.forecast_2030'), value: '+1.5°C', change: t('env.projection') }] },
    humidity: { title: t('env.metric_humidity'), icon: Droplets, current: '78%', trend: t('env.humidity_trend'), status: t('env.status_moderate'),
      regions: [{ name: t('env.region_amazon'), value: '85%', change: '-1.2%' }, { name: 'Sahara', value: '15%', change: '-0.8%' }, { name: 'Oceania', value: '72%', change: '+1.5%' }, { name: t('env.region_north_america'), value: '65%', change: '+0.9%' }],
      details: [{ label: t('env.avg_humidity'), value: '78%', change: '+2.1%' }, { label: t('env.water_vapor'), value: '25.2 kg/m³', change: '+4.2%' }, { label: t('env.global_precip'), value: '1.086 mm', change: '+1.8%' }, { label: t('env.ocean_evap'), value: '1.37 m/yr', change: '+2.5%' }] },
    airQuality: { title: t('env.metric_air_quality'), icon: Wind, current: 'AQI 156', trend: t('env.air_trend'), status: t('env.status_moderate'),
      regions: [{ name: t('env.region_china'), value: 'AQI 201', change: '+15' }, { name: t('env.region_india'), value: 'AQI 178', change: '+8' }, { name: t('env.region_europe'), value: 'AQI 45', change: '-3' }, { name: t('env.region_canada'), value: 'AQI 32', change: '-1' }],
      details: [{ label: 'PM2.5 Global', value: '15.2 μg/m³', change: '+8%' }, { label: 'PM10 Global', value: '28.4 μg/m³', change: '+5%' }, { label: 'NO₂', value: '21.8 μg/m³', change: '+12%' }, { label: 'O₃', value: '64.2 μg/m³', change: '+7%' }] },
    energy: { title: t('env.metric_energy'), icon: Zap, current: '29.1%', trend: t('env.energy_trend'), status: t('env.status_normal'),
      regions: [{ name: t('env.region_norway'), value: '98%', change: '+1%' }, { name: t('env.region_brazil'), value: '85%', change: '+2%' }, { name: t('env.region_germany'), value: '46%', change: '+4%' }, { name: t('env.region_china'), value: '28%', change: '+6%' }],
      details: [{ label: t('env.solar_energy'), value: '8.7%', change: '+15%' }, { label: t('env.wind_energy'), value: '12.3%', change: '+18%' }, { label: t('env.hydro_energy'), value: '6.8%', change: '+2%' }, { label: t('env.other_renewables'), value: '1.3%', change: '+25%' }] },
    oceans: { title: t('env.metric_oceans'), icon: Droplets, current: 'pH 8.1', trend: t('env.oceans_trend'), status: t('env.status_critical'),
      regions: [{ name: t('env.region_north_atlantic'), value: 'pH 8.05', change: '-0.12' }, { name: t('env.region_pacific'), value: 'pH 8.08', change: '-0.09' }, { name: t('env.region_indian'), value: 'pH 8.12', change: '-0.08' }, { name: t('env.region_arctic'), value: 'pH 8.02', change: '-0.15' }],
      details: [{ label: t('env.ocean_acidification'), value: 'pH 8.1', change: '-0.1' }, { label: t('env.surface_temp'), value: '16.1°C', change: '+0.6°C' }, { label: t('env.sea_level'), value: '+21.3 cm', change: t('env.since_1880') }, { label: t('env.ice_cover'), value: '13.2M km²', change: '-13%' }] },
    forests: { title: t('env.metric_forests'), icon: Leaf, current: t('env.forests_current'), trend: t('env.forests_trend'), status: t('env.status_critical'),
      regions: [{ name: t('env.region_amazon'), value: '5.5M km²', change: '-0.4%' }, { name: 'Congo', value: '2.0M km²', change: '-0.2%' }, { name: t('env.region_boreal'), value: '17M km²', change: '-0.1%' }, { name: t('env.region_temperate'), value: '7M km²', change: '+0.1%' }],
      details: [{ label: t('env.forest_cover'), value: '4.06B ha', change: '-10M/yr' }, { label: t('env.deforestation'), value: '10M ha', change: '+2%' }, { label: t('env.threatened_species'), value: '41,459', change: '+1.2K' }, { label: t('env.reforestation'), value: '5.2M ha', change: '+8%' }] },
  };
}
