import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { complete195Countries as worldCountriesData } from '../data/complete195Countries';
import { Globe, Users, MapPin, Maximize, Earth, Zap, Building2, DollarSign, Cloud, Trees, AlertTriangle, Leaf, TrendingUp, Bell } from 'lucide-react';

interface GlobalStatsProps {
  selectedContinent: string | null;
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
  showEnvironmental: boolean;
  onToggleEnvironmental: () => void;
}

const mockCountryData: { [key: string]: any } = {
  Brasil: {
    capital: "Brasília",
    continent: "América do Sul",
    population: "215M",
    gdp: 85,
    energy: 92,
    co2: 45,
    forest: 78,
  },
  Portugal: {
    capital: "Lisboa",
    continent: "Europa",
    population: "10.3M",
    gdp: 72,
    energy: 88,
    co2: 38,
    forest: 35,
  },
  China: {
    capital: "Pequim",
    continent: "Ásia",
    population: "1.4B",
    gdp: 98,
    energy: 95,
    co2: 82,
    forest: 23,
  },
};

export function GlobalStats({
  selectedContinent,
  selectedCountry,
  onCountrySelect,
  showEnvironmental,
  onToggleEnvironmental,
}: GlobalStatsProps) {
  const { t } = useTranslation();
  const filteredCountries = selectedContinent 
    ? worldCountriesData.filter(country => country.continent === selectedContinent)
    : worldCountriesData;

  const totalPopulation = filteredCountries
    .filter(country => country.population)
    .reduce((sum, country) => sum + (country.population || 0), 0);

  const totalArea = filteredCountries
    .filter(country => country.area)
    .reduce((sum, country) => sum + (country.area || 0), 0);

  const continents = Array.from(new Set(filteredCountries.map(country => country.continent)));

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const countryData = selectedCountry ? mockCountryData[selectedCountry] : null;

  return (
    <>
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <Globe className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-cyan-400">GaiaMind</h1>
            <p className="text-sm text-gray-300">{t('map.global_statistics')}</p>
          </div>
        </div>
        <div className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-4 py-2 rounded-lg flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-sm">{t('map.env_active')}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="absolute top-20 left-4 right-4 z-[1000] grid grid-cols-4 gap-4">
        <div className="bg-black/80 border border-cyan-500 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Globe className="w-8 h-8 text-cyan-400" />
            <div className="text-right text-white">
              <div className="text-2xl font-bold">{filteredCountries.length}</div>
              <div className="text-sm text-gray-300">{t('map.countries')}</div>
            </div>
          </div>
        </div>
        <div className="bg-black/80 border border-green-500 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Earth className="w-8 h-8 text-green-400" />
            <div className="text-right text-white">
              <div className="text-2xl font-bold">{continents.length}</div>
              <div className="text-sm text-gray-300">{t('map.continents')}</div>
            </div>
          </div>
        </div>
        <div className="bg-black/80 border border-orange-500 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-orange-400" />
            <div className="text-right text-white">
              <div className="text-2xl font-bold">{formatNumber(totalPopulation)}</div>
              <div className="text-sm text-gray-300">{t('map.population')}</div>
            </div>
          </div>
        </div>
        <div className="bg-black/80 border border-purple-500 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Maximize className="w-8 h-8 text-purple-400" />
            <div className="text-right text-white">
              <div className="text-2xl font-bold">{formatNumber(totalArea)} km²</div>
              <div className="text-sm text-gray-300">{t('map.total_area')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-[1000] text-center">
        <p className="text-sm text-gray-400">{t('map.data_based')}</p>
      </div>

      {/* Country Detail Panel */}
      {countryData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-60 left-4 right-4 z-[1000] bg-black/90 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-cyan-400">{selectedCountry}</h2>
            <button
              onClick={() => onCountrySelect(null)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm text-gray-400">{t('map.capital')}</div>
                  <div>{countryData.capital}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white">
                <MapPin className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-sm text-gray-400">{t('map.continent')}</div>
                  <div>{countryData.continent}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Users className="w-5 h-5 text-orange-400" />
                <div>
                  <div className="text-sm text-gray-400">{t('map.population')}</div>
                  <div>{countryData.population}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">{t('map.gdp')}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full" style={{ width: `${countryData.gdp}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm">{t('map.energy')}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-yellow-400 h-full" style={{ width: `${countryData.energy}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-4 h-4 text-gray-400" />
                  <span className="text-white text-sm">{t('map.co2')}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full" style={{ width: `${countryData.co2}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trees className="w-4 h-4 text-green-400" />
                  <span className="text-white text-sm">{t('map.forest')}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-400 h-full" style={{ width: `${countryData.forest}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Environmental Cards */}
      {showEnvironmental && (
        <div className="absolute bottom-20 left-4 right-4 z-[1000] grid grid-cols-3 gap-4">
          <div className="bg-black/80 border border-blue-500 rounded-lg p-6 backdrop-blur-sm">
            <Cloud className="w-12 h-12 text-white mb-4" />
            <div className="text-white">
              <div className="text-2xl font-bold mb-1">23°C</div>
              <div className="text-sm text-gray-300">{t('map.normal')}</div>
            </div>
          </div>
          <div className="bg-black/80 border border-green-500 rounded-lg p-6 backdrop-blur-sm">
            <Leaf className="w-12 h-12 text-white mb-4" />
            <div className="text-white">
              <div className="text-2xl font-bold mb-1">78%</div>
              <div className="text-sm text-gray-300">{t('map.good')}</div>
            </div>
          </div>
          <div className="bg-black/80 border border-red-500 rounded-lg p-6 backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-white mb-4" />
            <div className="text-white">
              <div className="text-2xl font-bold mb-1">3</div>
              <div className="text-sm text-gray-300">{t('map.attention')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="absolute top-20 right-4 w-80 z-[1000] space-y-4">
        {/* Legenda */}
        <div className="bg-black/80 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-cyan-400 mb-3 flex items-center gap-2">
            📘 {t('map.legend')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-gray-300">{t('map.global_data')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-gray-300">{t('map.sustainability')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-gray-300">{t('map.alerts')}</span>
            </div>
          </div>
        </div>

        {/* Continentes / Países */}
        <div className="bg-black/80 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-cyan-400 mb-3 flex items-center gap-2">
            🗺️ {t('map.continent_countries')}
          </h3>
          <div className="space-y-2">
            {Object.keys(mockCountryData).map((country) => (
              <button
                key={country}
                onClick={() => onCountrySelect(country)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedCountry === country
                    ? "bg-cyan-500/30 border border-cyan-400/50 text-white"
                    : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>{country}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dados Ambientais */}
        <div className="bg-black/80 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-cyan-400 mb-3 flex items-center gap-2">
            🌡️ {t('map.environmental_data')}
          </h3>
          <button
            onClick={onToggleEnvironmental}
            className={`w-full px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              showEnvironmental
                ? "bg-green-500/30 border border-green-400/50 text-white"
                : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
            }`}
          >
            <span>{showEnvironmental ? t('map.hide') : t('map.show')}</span>
          </button>
        </div>

        {/* Comparar Países */}
        <div className="bg-black/80 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-cyan-400 mb-3 flex items-center gap-2">
            📊 {t('map.compare')}
          </h3>
          <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg text-white hover:border-blue-400/60 transition-all flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>{t('map.start_compare')}</span>
          </button>
        </div>

        {/* Atualizações Recentes */}
        <div className="bg-black/80 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-cyan-400 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('map.recent_updates')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="p-2 rounded bg-gray-800/50">
              <div className="text-gray-400">{t('map.last_update')}</div>
              <div className="text-cyan-400">{t('map.updated_recently')}</div>
            </div>
            <div className="p-2 rounded bg-gray-800/50">
              <div className="text-gray-400">{t('map.new_data')}</div>
              <div className="text-green-400">{filteredCountries.length} {t('map.countries')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}