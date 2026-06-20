import { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, X } from 'lucide-react';
import { complete195Countries } from '../data/complete195Countries';

interface ComparisonData {
  country: string;
  temperature: number;
  co2: number;
  epi: number;
  renewable: number;
  population: number;
}

interface CountryComparisonProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CountryComparison({ isOpen, onClose }: CountryComparisonProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  const addCountry = (countryName: string) => {
    if (selectedCountries.length >= 4 || selectedCountries.includes(countryName)) return;
    
    const newCountries = [...selectedCountries, countryName];
    setSelectedCountries(newCountries);
    
    // Generate mock comparison data
    const mockData: ComparisonData = {
      country: countryName,
      temperature: 15 + Math.random() * 20,
      co2: 300 + Math.random() * 200,
      epi: 40 + Math.random() * 40,
      renewable: Math.random() * 80,
      population: complete195Countries.find(c => c.country === countryName)?.population || 0
    };
    
    setComparisonData([...comparisonData, mockData]);
  };

  const removeCountry = (countryName: string) => {
    setSelectedCountries(selectedCountries.filter(c => c !== countryName));
    setComparisonData(comparisonData.filter(d => d.country !== countryName));
  };

  const getBarWidth = (value: number, max: number) => {
    return `${(value / max) * 100}%`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black/90 backdrop-blur-sm text-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Comparação de Países
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Country Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Selecionar Países (máx. 4)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {complete195Countries.slice(0, 20).map((country) => (
              <button
                key={country.country}
                onClick={() => addCountry(country.country)}
                disabled={selectedCountries.includes(country.country) || selectedCountries.length >= 4}
                className="text-left p-2 text-xs bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {country.country}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Countries */}
        {selectedCountries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Países Selecionados</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCountries.map((country) => (
                <div key={country} className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                  {country}
                  <button onClick={() => removeCountry(country)} className="hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Charts */}
        {comparisonData.length > 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Comparação de Indicadores
            </h3>

            {/* Temperature Comparison */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3 text-red-400">Temperatura Média (°C)</h4>
              <div className="space-y-2">
                {comparisonData.map((data) => {
                  const maxTemp = Math.max(...comparisonData.map(d => d.temperature));
                  return (
                    <div key={data.country} className="flex items-center gap-3">
                      <div className="w-24 text-xs">{data.country}</div>
                      <div className="flex-1 bg-white/10 rounded-full h-4 relative">
                        <div 
                          className="bg-red-400 h-full rounded-full"
                          style={{ width: getBarWidth(data.temperature, maxTemp) }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{data.temperature.toFixed(1)}°</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CO2 Comparison */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3 text-orange-400">Níveis de CO₂ (ppm)</h4>
              <div className="space-y-2">
                {comparisonData.map((data) => {
                  const maxCO2 = Math.max(...comparisonData.map(d => d.co2));
                  return (
                    <div key={data.country} className="flex items-center gap-3">
                      <div className="w-24 text-xs">{data.country}</div>
                      <div className="flex-1 bg-white/10 rounded-full h-4 relative">
                        <div 
                          className="bg-orange-400 h-full rounded-full"
                          style={{ width: getBarWidth(data.co2, maxCO2) }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{data.co2.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EPI Comparison */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3 text-green-400">Índice de Performance Ambiental</h4>
              <div className="space-y-2">
                {comparisonData.map((data) => {
                  const maxEPI = Math.max(...comparisonData.map(d => d.epi));
                  return (
                    <div key={data.country} className="flex items-center gap-3">
                      <div className="w-24 text-xs">{data.country}</div>
                      <div className="flex-1 bg-white/10 rounded-full h-4 relative">
                        <div 
                          className="bg-green-400 h-full rounded-full"
                          style={{ width: getBarWidth(data.epi, maxEPI) }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{data.epi.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Renewable Energy Comparison */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3 text-blue-400">Energia Renovável (%)</h4>
              <div className="space-y-2">
                {comparisonData.map((data) => {
                  return (
                    <div key={data.country} className="flex items-center gap-3">
                      <div className="w-24 text-xs">{data.country}</div>
                      <div className="flex-1 bg-white/10 rounded-full h-4 relative">
                        <div 
                          className="bg-blue-400 h-full rounded-full"
                          style={{ width: `${data.renewable}%` }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{data.renewable.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {comparisonData.length <= 1 && (
          <div className="text-center text-white/60 py-8">
            Selecione pelo menos 2 países para comparar
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}