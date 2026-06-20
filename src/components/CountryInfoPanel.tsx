import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCapitalWeather, CapitalWeather } from '../services/weatherService';

interface Location {
  name: string;
  lat: number;
  lon: number;
  population?: number;
  type: 'capital' | 'city' | 'province' | 'village';
}

interface CountryData {
  name: string;
  capital: string;
  population: number;
  co2?: number;
  coordinates: [number, number];
  locations?: Location[];
}

interface CountryInfoPanelProps {
  country: CountryData | null;
  onClose: () => void;
}

type WeatherTab = 'temperatura' | 'chuva' | 'vento';

export function CountryInfoPanel({ country, onClose }: CountryInfoPanelProps) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<CapitalWeather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [tab, setTab] = useState<WeatherTab>('temperatura');

  useEffect(() => {
    if (!country) return;
    setWeather(null);
    setLoadingWeather(true);
    const [lon, lat] = country.coordinates;
    getCapitalWeather(lat, lon).then(w => {
      setWeather(w);
      setLoadingWeather(false);
    });
  }, [country?.name]);

  if (!country) return null;

  const tabData = weather?.hourly.slice(0, 8).map(h => ({
    label: h.time,
    value: tab === 'temperatura' ? h.temp : tab === 'chuva' ? h.rain : h.wind,
  })) ?? [];

  const maxVal = Math.max(...tabData.map(d => d.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="absolute right-6 top-16 w-72 bg-black/90 backdrop-blur-md border border-white/20 text-white z-20"
      style={{ maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h2 className="text-sm font-light text-white tracking-wider">{country.name.toUpperCase()}</h2>
        <Button onClick={onClose} size="sm" variant="ghost" className="w-6 h-6 p-0 text-white/60 hover:text-white">
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Weather Block */}
      <div className="p-4 border-b border-white/10">
        {loadingWeather && <p className="text-xs text-white/40">{t('map.loading_weather')}</p>}
        {weather && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-3xl font-light">{weather.temperature}°C</span>
              <span className="text-2xl">{weather.icon}</span>
            </div>
            <p className="text-xs text-white/70 mb-3">{t(`wmo.${weather.weatherCode}`) || weather.description}</p>

            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">{t('map.rain')}</div>
                <div>{weather.rainChance}%</div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">{t('map.humidity')}</div>
                <div>{weather.humidity}%</div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">{t('map.wind')}</div>
                <div>{weather.windSpeed} km/h</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/50 mb-3">
              <span>↑ {weather.tempMax}°C</span>
              <span className="text-white/30">{t('map.meteorology')}</span>
              <span>↓ {weather.tempMin}°C</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-2">
              {(['temperatura', 'chuva', 'vento'] as WeatherTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-xs py-1 rounded capitalize transition-colors ${
                    tab === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Mini chart */}
            <div className="flex items-end gap-1 h-12">
              {tabData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm bg-blue-400/60"
                    style={{ height: `${Math.max((d.value / maxVal) * 40, 2)}px` }}
                  />
                  <span className="text-white/30" style={{ fontSize: '9px' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Country Info */}
      <div className="p-4 space-y-3 text-xs">
        <div className="flex justify-between">
          <span className="text-white/60">capital</span>
          <span className="text-white">{country.capital}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">population</span>
          <span className="text-white">{(country.population / 1000000).toFixed(1)}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">co₂ emissions</span>
          <span className="text-white">{country.co2 || '—'} Mt</span>
        </div>

        {country.locations && (
          <div className="space-y-2">
            <h4 className="text-white/60 uppercase tracking-wider">Locations</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {country.locations.slice(0, 6).map((location, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-white/80">{location.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    location.type === 'capital' ? 'bg-red-500/20 text-red-300' :
                    location.type === 'city' ? 'bg-blue-500/20 text-blue-300' :
                    location.type === 'province' ? 'bg-green-500/20 text-green-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>{location.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-white/10">
          <h4 className="text-white/60 uppercase tracking-wider mb-2">Analysis</h4>
          <p className="text-white/70 leading-relaxed font-light">{getCountryAnalysis(country.name)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function getCountryAnalysis(countryName: string): string {
  const analyses: Record<string, string> = {
    'Brasil': 'O Brasil possui a maior floresta tropical do mundo e é líder em energia renovável, mas enfrenta desafios com desmatamento na Amazônia.',
    'Estados Unidos': 'Maior economia mundial com altas emissões per capita, mas investindo significativamente em tecnologias limpas e energia renovável.',
    'China': 'Maior emissor global de CO₂, porém também o maior investidor em energia solar e eólica, liderando a transição energética.',
    'Alemanha': 'Pioneira na transição energética (Energiewende) com alta penetração de renováveis e metas ambiciosas de neutralidade carbônica.',
    'Austrália': 'Rica em recursos naturais e energia solar, mas ainda dependente de carvão. Vulnerável aos impactos das mudanças climáticas.'
  };
  return analyses[countryName] || 'País com potencial único para contribuir com soluções sustentáveis e mitigação das mudanças climáticas globais.';
}
