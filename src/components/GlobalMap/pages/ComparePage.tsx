import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, BarChart3, Users, Zap, Leaf, TrendingUp, Award, DollarSign, Trees, Cloud, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ALL_UN_COUNTRIES } from '../../../data/allUNCountries';
import { GlobalAPIsService } from '../../../services/globalAPIsService';
import { PageShell } from './PageShell';
import type { MapPage } from '../hooks/useMapState';
import { authFetch } from '../../../services/authFetch';

interface Props { onClose: () => void; onNavigate?: (page: MapPage) => void; currentPage?: MapPage; }

export function ComparePage({ onClose, onNavigate, currentPage }: Props) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedCountries, setSelectedCountries] = useState<any[]>([]);
  const [loadingCountries, setLoadingCountries]   = useState<Set<string>>(new Set());
  const [view, setView]                   = useState<'table' | 'chart'>('table');
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [dataYears, setDataYears]         = useState<Record<string, Record<string, number>>>({});

  const filtered = useMemo(() => {
    if (!searchTerm) return [];
    return ALL_UN_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 6);
  }, [searchTerm]);

  const calcSustainability = (data: any) => {
    // Fallback local usado apenas se o pipeline não responder
    if (!data) return 40;
    let score = 50;
    if (data.renewable_energy?.value) score += (data.renewable_energy.value / 100) * 30;
    if (data.co2_emissions?.value)    score += Math.max(0, 25 - (data.co2_emissions.value / 20) * 25);
    if (data.forest_area?.value)      score += (data.forest_area.value / 100) * 20;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const fetchPipelineScore = async (countryCode: string): Promise<{ score: number | null; verdict: string | null }> => {
    try {
      const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('gaiamind-auth')
        ? JSON.parse(localStorage.getItem('gaiamind-auth')!).token : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await authFetch(`${BASE}/api/offline/country/${countryCode}`, { headers, signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { score: null, verdict: null };
      const d = await res.json();
      const score = d?.score?.gaia_score_100 ?? null;
      const verdict = d?.verdict?.verdict ?? null;
      return {
        score: score !== null ? Math.round(Number(score)) : null,
        verdict,
      };
    } catch {
      return { score: null, verdict: null };
    }
  };

  const addCountry = async (country: any) => {
    if (selectedCountries.length >= 4 || selectedCountries.find(c => c.name === country.name)) return;
    setLoadingCountries(prev => new Set([...prev, country.name]));
    try {
      const [api, pipelineScore] = await Promise.all([
        GlobalAPIsService.getWorldBankData(country.code),
        fetchPipelineScore(country.code),
      ]);
      const d = api?.data || {};
      setDataYears(prev => ({
        ...prev,
        [country.name]: {
          gdpPerCapita:    d.gdp_per_capita?.year    || 0,
          population:      d.population?.year        || 0,
          renewableEnergy: d.renewable_energy?.year  || 0,
          co2Emissions:    d.co2_emissions?.year     || 0,
          forestArea:      d.forest_area?.year       || 0,
        }
      }));
      setSelectedCountries(prev => [...prev, {
        name: country.name, code: country.code, capital: country.capital,
        continent: country.continent, flag: country.flag,
        gdpPerCapita:        d.gdp_per_capita?.value    || null,
        population:          d.population?.value        || null,
        renewableEnergy:     d.renewable_energy?.value  || null,
        co2Emissions:        d.co2_emissions?.value     || null,
        forestArea:          d.forest_area?.value       || null,
        // Score real do pipeline GaiaMind (0-100); fallback para cálculo local
        sustainabilityScore: pipelineScore.score ?? calcSustainability(d),
        verdict:             pipelineScore.verdict ?? null,
      }]);
      if (selectedCountries.length === 3) setSidebarOpen(false);
    } catch {}
    finally { setLoadingCountries(prev => { const s = new Set(prev); s.delete(country.name); return s; }); }
  };

  const removeCountry = (name: string) => {
    setSelectedCountries(prev => prev.filter(c => c.name !== name));
    setDataYears(prev => { const n = {...prev}; delete n[name]; return n; });
    if (selectedCountries.length <= 1) setSidebarOpen(true);
  };

  const METRICS = [
    { key: 'gdpPerCapita',        label: t('map.metric.gdpPerCapita'),    icon: DollarSign, color: '#22c55e', source: 'World Bank NY.GDP.PCAP.CD', fmt: (v: number) => v ? `$${v.toLocaleString(undefined,{maximumFractionDigits:0})}` : 'N/A' },
    { key: 'population',          label: t('map.metric.population'),         icon: Users,      color: '#3b82f6', source: 'World Bank SP.POP.TOTL',    fmt: (v: number) => v ? `${(v/1e6).toFixed(1)}M` : 'N/A' },
    { key: 'renewableEnergy',     label: t('map.metric.renewableEnergy'), icon: Zap,        color: '#eab308', source: 'World Bank EG.FEC.RNEW.ZS', fmt: (v: number) => v ? `${v.toFixed(1)}%` : 'N/A' },
    { key: 'co2Emissions',        label: t('map.metric.co2Emissions'),      icon: Cloud,      color: '#ef4444', source: 'World Bank EN.ATM.CO2E.PC',  fmt: (v: number) => v ? `${v.toFixed(2)} t` : 'N/A' },
    { key: 'forestArea',          label: t('map.metric.forestArea'),    icon: Trees,      color: '#4ade80', source: 'World Bank AG.LND.FRST.ZS',  fmt: (v: number) => v ? `${v.toFixed(1)}%` : 'N/A' },
    { key: 'sustainabilityScore', label: t('map.metric.sustainabilityScore'),  icon: Leaf,       color: '#00E676', source: 'GaiaMind Pipeline — score composto (0-100)',       fmt: (v: number) => `${v}/100` },
    { key: 'verdict', label: 'Veredito GaiaMind', icon: Award, color: '#a78bfa', source: 'GaiaMind Pipeline — outlook BMA',
      fmt: (v: any) => {
        if (!v) return '—';
        const map: Record<string, string> = {
          'CRITICAL': '🔴 CRÍTICO', 'AT_RISK': '🟠 EM RISCO',
          'LIKELY_DECLINE': '🟡 PROV. DECLIVE', 'STABLE': '🟢 ESTÁVEL',
          'IMPROVING_AT_RISK': '🟡 MELHORANDO', 'LIKELY_IMPROVE': '🟢 PROV. MELHORA',
          'STRONG_IMPROVE': '🟢 FORTE MELHORA',
        };
        return map[v] ?? v;
      }
    },
  ];

  const best = (key: string) => selectedCountries.length === 0 ? null :
    selectedCountries.reduce((b, c) => ((c[key] || 0) > (b[key] || 0) ? c : b));

  const hasCountries = selectedCountries.length > 0;

  return (
    <PageShell
      title={t('map.compare_title')}
      subtitle={t('map.compare_subtitle', { count: selectedCountries.length })}
      onClose={onClose} onNavigate={onNavigate} currentPage={currentPage}
      headerRight={
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? t('map.hide_search') : t('map.show_search')}
            style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'0.3rem 0.6rem', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'rgba(224,247,250,0.7)', cursor:'pointer', fontSize:'0.72rem' }}
          >
            {sidebarOpen ? <ChevronLeft style={{ width:'12px', height:'12px' }} /> : <ChevronRight style={{ width:'12px', height:'12px' }} />}
            {sidebarOpen ? t('map.hide') : t('map.search')}
          </button>
          {/* View toggle */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:'6px', padding:'2px', gap:'2px' }}>
            {(['table','chart'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:'0.3rem 0.6rem', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:'0.72rem', fontWeight: view===v ? 600 : 400, background: view===v ? 'rgba(0,230,118,0.2)' : 'transparent', color: view===v ? '#00E676' : 'rgba(224,247,250,0.5)' }}>
                {v === 'table' ? t('map.view.table') : t('map.view.chart')}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns: sidebarOpen ? 'min(260px, 35%) 1fr' : '1fr', gap:'1rem', transition:'grid-template-columns 0.2s ease' }}>

        {/* ── SIDEBAR DE PESQUISA ── */}
        {sidebarOpen && (
          <div className="insights-card" style={{ display:'flex', flexDirection:'column', gap:'0.75rem', height:'fit-content' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'0.7rem', color:'#00E676', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                {t('map.countries_count', { count: selectedCountries.length })}
              </div>
              {selectedCountries.length > 0 && (
                <button onClick={() => setSidebarOpen(false)}
                  style={{ fontSize:'0.65rem', padding:'0.15rem 0.4rem', background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:'4px', color:'#00E676', cursor:'pointer' }}>
                  {t('map.hide')} ◀
                </button>
              )}
            </div>

            {/* Input de pesquisa */}
            <div style={{ position:'relative' }}>
              <Search style={{ position:'absolute', left:'0.6rem', top:'50%', transform:'translateY(-50%)', width:'14px', height:'14px', color:'rgba(224,247,250,0.4)' }} />
              <input type="text" placeholder={t('map.search_placeholder')} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-responsive" style={{ paddingLeft:'2rem' }} />
            </div>

            {/* Países seleccionados */}
            {selectedCountries.map(c => (
              <div key={c.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 0.75rem', background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.25)', borderRadius:'6px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', minWidth:0 }}>
                  <span style={{ fontSize:'1rem', flexShrink:0 }}>{c.flag}</span>
                  <span style={{ fontSize:'0.78rem', color:'#E0F7FA', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                </div>
                <button onClick={() => removeCountry(c.name)}
                  style={{ width:'20px', height:'20px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'50%', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <X style={{ width:'10px', height:'10px' }} />
                </button>
              </div>
            ))}

            {/* Sugestões de pesquisa */}
            {filtered.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {filtered.map(c => (
                  <div key={c.code} className="card-base" style={{ padding:'0.5rem 0.75rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', minWidth:0 }}>
                      <span style={{ fontSize:'0.9rem', flexShrink:0 }}>{c.flag}</span>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'0.78rem', color:'#E0F7FA', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize:'0.65rem', color:'rgba(224,247,250,0.4)' }}>{c.capital}</div>
                      </div>
                    </div>
                    {!selectedCountries.find(x => x.name === c.name) && (
                      <button onClick={() => addCountry(c)}
                        disabled={selectedCountries.length >= 4 || loadingCountries.has(c.name)}
                        style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'0.25rem 0.5rem', background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.3)', borderRadius:'4px', color:'#00E676', cursor:'pointer', fontSize:'0.7rem', flexShrink:0 }}>
                        {loadingCountries.has(c.name)
                          ? <span style={{ display:'inline-block', width:'10px', height:'10px', border:'2px solid #00E676', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                          : <Plus style={{ width:'10px', height:'10px' }} />}
                        {loadingCountries.has(c.name) ? '...' : t('map.add')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!searchTerm && selectedCountries.length === 0 && (
              <p style={{ fontSize:'0.72rem', color:'rgba(224,247,250,0.35)', textAlign:'center', padding:'0.5rem 0' }}>
                {t('map.search_empty')}
              </p>
            )}

            {selectedCountries.length >= 4 && (
              <p style={{ fontSize:'0.72rem', color:'#eab308', textAlign:'center' }}>
                {t('map.search_max_reached')}
              </p>
            )}

            {/* Fonte dos dados */}
            <div style={{ paddingTop:'0.5rem', borderTop:'1px solid rgba(0,230,118,0.1)', display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', animation:'h2-pulse 2s ease-in-out infinite', flexShrink:0 }} />
              <span style={{ fontSize:'0.68rem', color:'#4ade80', fontWeight:600 }}>World Bank</span>
              <span style={{ fontSize:'0.68rem', color:'rgba(224,247,250,0.35)' }}>· dados em tempo real</span>
            </div>
          </div>
        )}

        {/* ── CONTEÚDO PRINCIPAL ── */}
        <div>
          {/* Países seleccionados em chips (quando sidebar fechada) */}
          {!sidebarOpen && selectedCountries.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1rem', alignItems:'center' }}>
              {selectedCountries.map(c => (
                <div key={c.name} style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.3rem 0.6rem', background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:'20px', fontSize:'0.75rem', color:'#E0F7FA' }}>
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  <button onClick={() => removeCountry(c.name)}
                    style={{ background:'none', border:'none', color:'rgba(224,247,250,0.4)', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
                    <X style={{ width:'10px', height:'10px' }} />
                  </button>
                </div>
              ))}
              {selectedCountries.length < 4 && (
                <button onClick={() => setSidebarOpen(true)}
                  style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'0.3rem 0.6rem', background:'rgba(0,230,118,0.06)', border:'1px dashed rgba(0,230,118,0.3)', borderRadius:'20px', color:'#00E676', cursor:'pointer', fontSize:'0.72rem' }}>
                  <Plus style={{ width:'10px', height:'10px' }} /> {t('map.add_country')}
                </button>
              )}
            </div>
          )}

          {selectedCountries.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'300px', gap:'1rem', color:'rgba(224,247,250,0.4)' }}>
              <BarChart3 style={{ width:'3rem', height:'3rem' }} />
              <p style={{ fontSize:'0.875rem', textAlign:'center' }}>{t('map.compare_prompt')}</p>
              <p style={{ fontSize:'0.72rem', color:'rgba(224,247,250,0.25)', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.35rem' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', animation:'h2-pulse 2s ease-in-out infinite', display:'inline-block' }} />
                {t('map.world_bank_realtime')}
              </p>
            </div>
          ) : view === 'table' ? (
            /* ── TABELA ── */
            <div className="insights-card" style={{ overflowX:'auto' }}>
              {/* Badge de fonte */}
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.75rem' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4ade80', animation:'h2-pulse 2s ease-in-out infinite', flexShrink:0 }} />
                <span style={{ fontSize:'0.72rem', color:'#4ade80', fontWeight:600 }}>{t('map.world_bank')}</span>
                <span style={{ fontSize:'0.72rem', color:'rgba(224,247,250,0.4)' }}>{t('map.world_bank_realtime')}</span>
                <span style={{ fontSize:'0.65rem', color:'rgba(224,247,250,0.25)', marginLeft:'auto' }}>{t('map.best_value_label')}</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'400px' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(0,230,118,0.15)' }}>
                    <th style={{ padding:'0.6rem 0.75rem', textAlign:'left', fontSize:'0.72rem', color:'rgba(224,247,250,0.5)', fontWeight:600, whiteSpace:'nowrap' }}>{t('map.metric_source_column')}</th>
                    {selectedCountries.map(c => (
                      <th key={c.name} style={{ padding:'0.6rem 0.75rem', textAlign:'center', fontSize:'0.72rem', color:'#E0F7FA', fontWeight:600 }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem' }}>
                          <span style={{ fontSize:'1.2rem' }}>{c.flag}</span>
                          <span style={{ whiteSpace:'nowrap' }}>{c.name}</span>
                          <span style={{ fontSize:'0.6rem', color:'rgba(224,247,250,0.35)' }}>{c.continent}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(m => {
                    const bestCountry = best(m.key);
                    return (
                      <tr key={m.key} style={{ borderBottom:'1px solid rgba(0,230,118,0.06)' }}>
                        <td style={{ padding:'0.6rem 0.75rem' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                            <m.icon style={{ width:'14px', height:'14px', color:m.color, flexShrink:0 }} />
                            <div>
                              <div style={{ fontSize:'0.78rem', color:'rgba(224,247,250,0.8)', fontWeight:500 }}>{m.label}</div>
                              <div style={{ fontSize:'0.6rem', color:'rgba(224,247,250,0.3)', fontFamily:'monospace' }}>{m.source}</div>
                            </div>
                          </div>
                        </td>
                        {selectedCountries.map(c => {
                          const isBest = bestCountry?.name === c.name && c[m.key];
                          const year = dataYears[c.name]?.[m.key];
                          return (
                            <td key={c.name} style={{ padding:'0.6rem 0.75rem', textAlign:'center' }}>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.1rem' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                                  {isBest && <Award style={{ width:'10px', height:'10px', color:'#fbbf24' }} />}
                                  <span style={{ fontSize:'0.85rem', fontWeight:600, color: isBest ? '#fbbf24' : m.color }}>
                                    {m.fmt(c[m.key])}
                                  </span>
                                </div>
                                {year ? <span style={{ fontSize:'0.6rem', color:'rgba(224,247,250,0.25)' }}>{year}</span> : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── GRÁFICO ── */
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {[
                { key:'sustainabilityScore', label:t('map.metric.sustainabilityScore'),  max:100, icon:Leaf,  color:'#00E676', source:'GaiaMind calc' },
                { key:'renewableEnergy',     label:t('map.metric.renewableEnergy'), max:100, icon:Zap,   color:'#eab308', source:'World Bank' },
                { key:'co2Emissions',        label:t('map.metric.co2Emissions'),        max:20,  icon:Cloud, color:'#ef4444', source:'World Bank' },
                { key:'gdpPerCapita',        label:t('map.metric.gdpPerCapita'),    max:80000, icon:DollarSign, color:'#22c55e', source:'World Bank' },
              ].map(chart => (
                <div key={chart.key} className="insights-card">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
                    <h4 style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', fontWeight:600, color:'#E0F7FA', margin:0 }}>
                      <chart.icon style={{ width:'14px', height:'14px', color:chart.color }} /> {chart.label}
                    </h4>
                    <span style={{ fontSize:'0.6rem', color:'rgba(224,247,250,0.3)', fontFamily:'monospace' }}>{chart.source}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {selectedCountries.map(c => {
                      const val = c[chart.key] || 0;
                      const pct = Math.min((val / chart.max) * 100, 100);
                      const isBest = best(chart.key)?.name === c.name && val;
                      return (
                        <div key={c.name} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                          <div style={{ width:'clamp(60px,15vw,90px)', fontSize:'0.72rem', color:'#E0F7FA', display:'flex', alignItems:'center', gap:'0.3rem', flexShrink:0 }}>
                            <span>{c.flag}</span>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                          </div>
                          <div style={{ flex:1, height:'22px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden', position:'relative' }}>
                            <div style={{ width:`${Math.max(pct,3)}%`, height:'100%', background: isBest ? '#fbbf24' : chart.color, borderRadius:'4px', transition:'width 0.8s ease', opacity: isBest ? 1 : 0.8 }} />
                            <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', color:'#fff', fontWeight:600 }}>
                              {chart.key === 'co2Emissions'  ? (val ? `${val.toFixed(1)}t` : 'N/A')
                               : chart.key === 'gdpPerCapita' ? (val ? `$${(val/1000).toFixed(0)}k` : 'N/A')
                               : (val ? `${val.toFixed(0)}%` : 'N/A')}
                            </span>
                          </div>
                          {isBest && <Award style={{ width:'12px', height:'12px', color:'#fbbf24', flexShrink:0 }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Insights */}
              <div className="insights-card" style={{ borderColor:'rgba(0,230,118,0.3)' }}>
                <h4 style={{ fontSize:'0.8rem', fontWeight:600, color:'#00E676', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <TrendingUp style={{ width:'14px', height:'14px' }} /> {t('map.compare_insights')}
                </h4>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                  {[
                    { key:'sustainabilityScore', label:t('map.insight.sustainability'),  fmt: (v: any) => `${v}%` },
                    { key:'gdpPerCapita',         label:t('map.insight.gdpPerCapita'),    fmt: (v: any) => `$${v?.toLocaleString(undefined,{maximumFractionDigits:0}) || 'N/A'}` },
                    { key:'renewableEnergy',      label:t('map.insight.renewableEnergy'), fmt: (v: any) => `${v?.toFixed(1) || 'N/A'}%` },
                    { key:'co2Emissions',         label:t('map.insight.co2Emissions'), fmt: (v: any) => `${v?.toFixed(2) || 'N/A'} t`, invert: true },
                  ].map(ins => {
                    const b = ins.invert
                      ? selectedCountries.reduce((best, c) => (c[ins.key] && (!best[ins.key] || c[ins.key] < best[ins.key])) ? c : best, selectedCountries[0])
                      : best(ins.key);
                    return b && b[ins.key] ? (
                      <div key={ins.key} style={{ fontSize:'0.75rem', color:'rgba(224,247,250,0.7)', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                        <Award style={{ width:'10px', height:'10px', color:'#fbbf24', flexShrink:0 }} />
                        <strong style={{ color:'#E0F7FA' }}>{b.name}</strong> lidera em {ins.label} ({ins.fmt(b[ins.key])})
                      </div>
                    ) : null;
                  })}
                  <div style={{ marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid rgba(0,230,118,0.1)', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', animation:'h2-pulse 2s ease-in-out infinite', flexShrink:0 }} />
                    <span style={{ fontSize:'0.68rem', color:'#4ade80', fontWeight:600 }}>World Bank</span>
                    <span style={{ fontSize:'0.68rem', color:'rgba(224,247,250,0.3)' }}>{t('map.world_bank_realtime')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
