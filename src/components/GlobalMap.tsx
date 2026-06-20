import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';
import { complete195Countries as worldCountriesData } from '../data/complete195Countries';
import { useDevice } from '../hooks/useDevice';
import { useMapState } from './GlobalMap/hooks/useMapState';
import { EnvironmentalPage } from './GlobalMap/pages/EnvironmentalPage';
import { ComparePage } from './GlobalMap/pages/ComparePage';
import { ExportPage } from './GlobalMap/pages/ExportPage';
import { CountrySearch } from './CountrySearch';
import { GlobalStatsPanel } from './GlobalStatsPanel';
import { GlobalDataPanel } from './GlobalDataPanel';
import { getCapitalWeather } from '../services/weatherService';
import { useEffect, useState, lazy, Suspense } from 'react';

// Lazy-load Digital Twin so it doesn't affect GlobalMap bundle if DTE errors
const DigitalTwinEarth = lazy(() => import('../features/digital-twin'));

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function CountryMarker({ country, onClick }: { country: any; onClick: (c: any) => void }) {
  const handlers = useMemo(() => ({ click: () => onClick(country) }), [country, onClick]);
  const icon = useMemo(() => new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41],
  }), []);
  return <Marker position={[country.latitude, country.longitude]} icon={icon} eventHandlers={handlers} zIndexOffset={1000} />;
}

export function GlobalMap() {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const map = useMapState();

  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [weatherTab, setWeatherTab] = useState<'temperature'|'rain'|'wind'>('temperature');
  const [localClock, setLocalClock] = useState('');
  const [showDTE, setShowDTE] = useState(false);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(r => r.json()).then(setGeoJsonData).catch(() => {});
  }, []);

  // Relógio local do país seleccionado
  useEffect(() => {
    if (!map.weather?.timezone) { setLocalClock(''); return; }
    const tz = map.weather.timezone;
    const tick = () => {
      const now = new Date();
      const day = now.toLocaleDateString(i18n.language, { weekday: 'long', timeZone: tz });
      const time = now.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz });
      setLocalClock(`${day.charAt(0).toUpperCase() + day.slice(1)}, ${time}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [map.weather?.timezone]);

  const handleMarkerClick = useCallback((country: any) => {
    map.selectCountry(country);
  }, [map]);

  const filteredCountries = map.selectedContinent
    ? worldCountriesData.filter(c => c.continent === map.selectedContinent)
    : worldCountriesData;

  const activePage = map.currentPage;

  return (
    <div className="global-map-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── MAPA (altura fixa, ocupa o viewport) ── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', flexShrink: 0 }}>
        {/* Search */}
        <CountrySearch onCountrySelect={(c) => map.selectCountry(c)} />

        {/* ── Digital Twin toggle — bottom-left, clear of Leaflet +/- and search ── */}
        <button
          onClick={() => setShowDTE(v => !v)}
          title={showDTE ? 'Voltar ao mapa 2D' : 'Abrir Digital Twin 3D'}
          style={{
            position: 'absolute', bottom: 24, left: 12, zIndex: 10000,
            background: showDTE ? '#1a6eb5' : 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 8, color: '#fff',
            padding: '7px 14px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            letterSpacing: '0.3px',
          }}
        >
          {showDTE ? '🗺️ 2D Map' : '🌍 3D Globe'}
        </button>

        {/* ── Digital Twin overlay — monta por cima do mapa ── */}
        {showDTE && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 9999 }}>
            <Suspense fallback={
              <div style={{ inset: 0, position: 'absolute', background: '#000814', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                A carregar Digital Twin…
              </div>
            }>
              <DigitalTwinEarth />
            </Suspense>
          </div>
        )}

        <MapContainer
          center={[20, 0]}
          zoom={isMobile ? 1 : 2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {geoJsonData && (
            <GeoJSON data={geoJsonData} style={() => ({ fillColor: 'rgba(52,168,83,0.1)', color: 'var(--border-normal)', weight: 1, fillOpacity: 0.3, interactive: false } as any)} />
          )}
          {filteredCountries.map((country, i) => (
            <CountryMarker key={i} country={country} onClick={handleMarkerClick} />
          ))}
        </MapContainer>

        {/* Info panel do país — bottom sheet mobile / lateral desktop */}
        {map.selectedCountry && activePage === 'map' && (
          <>
            {isMobile && (
              <div onClick={map.closeCountry} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9998 }} aria-hidden="true" />
            )}
            <motion.div
              className="global-map-selected-country-panel"
              initial={{ opacity:0, y: isMobile ? 60 : 0, x: isMobile ? 0 : -50 }}
              animate={{ opacity:1, y:0, x:0 }}
              style={isMobile ? {
                position:'fixed', bottom:0, left:0, right:0,
                maxHeight:'65vh', overflowY:'auto', zIndex:9999,
                borderRadius:'16px 16px 0 0', background:'var(--bg-surface)',
                border:'1px solid var(--border-normal)',
                boxShadow:'0 -8px 32px rgba(0,0,0,0.1)', color:'var(--text-primary)',
                paddingBottom:'env(safe-area-inset-bottom)',
              } : {
                position:'fixed', top:'112px', left:'270px',
                width:'clamp(220px, 22vw, 272px)',
                maxHeight:'calc(100vh - 128px)', overflowY:'auto',
                zIndex:9999, borderRadius:'12px', background:'var(--bg-surface)',
                border:'1px solid var(--border-normal)',
                boxShadow:'0 8px 32px rgba(0,0,0,0.1)', color:'var(--text-primary)',
              }}
            >
              {isMobile && (
                <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
                  <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'var(--border-normal)' }} />
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: isMobile ? '10px 14px' : '12px 14px', borderBottom:'1px solid var(--border-normal)', gap:'8px' }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <h3 style={{ fontWeight:600, color:'var(--text-primary)', margin:0, fontSize:'14px', fontFamily:'"Google Sans", sans-serif', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{map.selectedCountry.country}</h3>
                  <p style={{ fontSize:'11px', color:'var(--text-secondary)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{map.selectedCountry.capital} · {map.selectedCountry.continent}</p>
                </div>
                <button onClick={map.closeCountry}
                    style={{ width:'28px', height:'28px', background:'var(--bg-input)', border:'none', borderRadius:'50%', color:'var(--text-secondary)', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                  aria-label={t('map.close')}>×</button>
              </div>

              {/* Weather */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-normal)' }}>
                {/* Hora local em tempo real */}
                {localClock && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'12px', padding:'6px 10px', background:'rgba(52,168,83,0.1)', borderRadius:'6px', border:'1px solid rgba(52,168,83,0.2)' }}>
                    <span style={{ fontSize:'12px' }}>🕒</span>
                      <span style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{t('map.local_time')}:</span>
                      <span style={{ fontSize:'12px', color:'var(--accent-green)', fontVariantNumeric:'tabular-nums' }}>{localClock}</span>
                  </div>
                )}
                {map.weatherLoading && (
                  <p style={{ fontSize:'12px', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ display:'inline-block', width:'10px', height:'10px', borderRadius:'50%', border:'2px solid var(--accent-green)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
                    {t('map.loading_weather')}
                  </p>
                )}
                {!map.weatherLoading && !map.weather && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:'12px', color:'var(--text-secondary)', margin:0 }}>{t('map.weather_unavailable')}</p>
                    <button onClick={map.retryWeather}
                      style={{ fontSize:'11px', padding:'4px 8px', background:'rgba(52,168,83,0.1)', border:'1px solid rgba(52,168,83,0.3)', borderRadius:'4px', color:'var(--accent-green)', cursor:'pointer' }}>
                      🔄 {t('map.retry')}
                    </button>
                  </div>
                )}
                {map.weather && (() => {
                  const w = map.weather!;
                  const tabData = w.hourly.slice(0,8).map(h => ({ label:h.time, value: weatherTab==='temperature'?h.temp:weatherTab==='rain'?h.rain:h.wind }));
                  const maxVal = Math.max(...tabData.map(d => d.value), 1);
                  return (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                        <span style={{ fontSize:'22px', fontWeight:400, color:'var(--text-primary)' }}>{w.temperature}°C</span>
                        <span style={{ fontSize:'20px' }}>{w.icon}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'10px' }}>
                        {[[t('map.rain'),`${w.rainChance}%`],[t('map.humidity'),`${w.humidity}%`],[t('map.wind'),`${w.windSpeed} km/h`]].map(([label,val], idx) => (
                          <div key={`weather-${idx}`} style={{ background:'var(--bg-input)', borderRadius:'6px', padding:'6px 4px', textAlign:'center', border:'1px solid var(--border-normal)' }}>
                            <div style={{ fontSize:'10px', color:'var(--text-secondary)', marginBottom:'2px' }}>{label}</div>
                            <div style={{ fontSize:'11px', color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'4px', marginBottom:'6px' }}>
                        {(['temperature','rain','wind'] as const).map(tab => (
                          <button key={tab} onClick={() => setWeatherTab(tab)} style={{ flex:1, fontSize:'10px', padding:'3px 2px', borderRadius:'4px', border:'none', cursor:'pointer', background: weatherTab===tab?'var(--color-primary)':'var(--bg-input)', color: weatherTab===tab?'#FFFFFF':'var(--text-secondary)', fontWeight: weatherTab===tab?500:'normal' }}>
                            {t(`map.${tab}`)}
                          </button>
                        ))}
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'36px' }}>
                        {tabData.map((d,i) => (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                            <div style={{ width:'100%', borderRadius:'2px', background:'var(--color-primary)', height:`${Math.max((d.value/maxVal)*28,2)}px`, opacity:0.8 }} />
                            <span style={{ fontSize:'8px', color:'var(--text-secondary)' }}>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Info */}
              <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px', fontSize:'12px' }}>
                {map.selectedCountry.population && (
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-secondary)' }}>{t('map.population')}</span>
                    <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{map.selectedCountry.population.toLocaleString()}</span>
                  </div>
                )}
                {map.selectedCountry.area && (
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-secondary)' }}>{t('map.area')}</span>
                    <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{map.selectedCountry.area.toLocaleString()} km²</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--text-secondary)' }}>{t('map.coordinates')}</span>
                  <span style={{ color:'var(--text-primary)', fontFamily:'monospace' }}>{map.selectedCountry.latitude.toFixed(2)}°, {map.selectedCountry.longitude.toFixed(2)}°</span>
                </div>
                <button onClick={() => map.setShowGlobalData(true)}
                    style={{ marginTop:'8px', padding:'10px', background:'var(--color-primary)', border:'none', borderRadius:'8px', color:'#FFFFFF', cursor:'pointer', fontWeight:600, fontSize:'13px', boxShadow:'0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                  {t('map.global_data')}
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Stats Panel mobile — bottom sheet */}
        {activePage === 'map' && isMobile && (
          <>
            {!map.selectedCountry && (
              <button onClick={() => setShowStatsPanel(true)}
                style={{ position:'fixed', bottom:'24px', right:'16px', zIndex:1001, background:'var(--color-primary)', color:'#FFFFFF', border:'none', borderRadius:'50px', padding:'10px 16px', fontWeight:700, fontSize:'13px', cursor:'pointer', boxShadow:'0 2px 6px rgba(0, 0, 0, 0.12)', display:'flex', alignItems:'center', gap:'6px', paddingBottom:'calc(10px + env(safe-area-inset-bottom))' }}>
                {t('map.global_data')}
              </button>
            )}
            {showStatsPanel && (
              <>
                <div onClick={() => setShowStatsPanel(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9990 }} aria-hidden="true" />
                <div className="global-map-bottom-sheet" style={{ position:'fixed', bottom:0, left:0, right:0, maxHeight:'85vh', overflowY:'auto', zIndex:9991, borderRadius:'16px 16px 0 0', background:'var(--bg-surface)', borderTop:'1px solid var(--border-normal)', boxShadow:'0 -4px 16px rgba(0,0,0,0.1)', paddingBottom:'env(safe-area-inset-bottom)' }}>
                  <button onClick={() => setShowStatsPanel(false)} style={{ position:'absolute', top:'12px', right:'16px', background:'var(--bg-input)', border:'1px solid var(--border-normal)', borderRadius:'50%', width:'32px', height:'32px', color:'var(--text-secondary)', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }} aria-label={t('map.close')}>×</button>
                  <GlobalStatsPanel selectedContinent={map.selectedContinent} selectedCountry={map.selectedCountry?.country||null} onCountrySelect={map.selectCountryByName} showEnvironmental={map.showEnvironmental} onToggleEnvironmental={() => map.setShowEnvironmental(!map.showEnvironmental)} onNavigate={map.navigateTo} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── STATS abaixo do mapa (desktop + mobile scroll) ── */}
      {activePage === 'map' && !map.selectedCountry && !isMobile && (
        <GlobalStatsPanel selectedContinent={map.selectedContinent} selectedCountry={map.selectedCountry?.country||null} onCountrySelect={map.selectCountryByName} showEnvironmental={map.showEnvironmental} onToggleEnvironmental={() => map.setShowEnvironmental(!map.showEnvironmental)} onNavigate={map.navigateTo} />
      )}

      {/* ── PÁGINAS (por cima do mapa) ── */}
      {activePage === 'environmental' && <EnvironmentalPage onClose={() => map.navigateTo('map')} onNavigate={map.navigateTo} currentPage={activePage} />}
      {activePage === 'compare'       && <ComparePage       onClose={() => map.navigateTo('map')} onNavigate={map.navigateTo} currentPage={activePage} />}
      {activePage === 'export'        && <ExportPage        onClose={() => map.navigateTo('map')} onNavigate={map.navigateTo} currentPage={activePage} />}

      {/* Modal Dados Globais */}
      {map.selectedCountry && map.showGlobalData && (
        <div style={{
          position: 'fixed',
          top: 'var(--header-height, 56px)',
          left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto',
        }}>
          <div className="global-data-panel" style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: 'calc(100vh - var(--header-height, 56px) - 32px)',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-normal)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          }}>
            <GlobalDataPanel
              countryCode={map.selectedCountry.iso2 || map.selectedCountry.country?.substring(0,2).toUpperCase() || 'XX'}
              countryName={map.selectedCountry.country}
              lat={map.selectedCountry.latitude}
              lon={map.selectedCountry.longitude}
              onClose={() => map.setShowGlobalData(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
