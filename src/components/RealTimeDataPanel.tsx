/**
 * Real-Time Data Panel Component
 * © 2025 - Painel para dados em tempo real de múltiplas APIs
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../services/apiConfigComplete';
import { authFetch } from '../services/authFetch';

interface RealTimeData {
  country_code: string;
  timestamp: string;
  data_sources: string[];
  air_quality: any;
  economic_data: any;
  weather_data: any;
  reliability_score: number;
  api_status: Record<string, string>;
  consolidated_metrics: any;
}

interface APIStatus {
  name: string;
  category: string;
  success: boolean;
  duration?: number;
  endpoint: string;
  data_type: string;
  error?: string;
}

export const RealTimeDataPanel: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  const [apiStatus, setApiStatus] = useState<APIStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const countries = [
    { code: 'USA', name: '🇺🇸 Estados Unidos' },
    { code: 'BRA', name: '🇧🇷 Brasil' },
    { code: 'CHN', name: '🇨🇳 China' },
    { code: 'DEU', name: '🇩🇪 Alemanha' },
    { code: 'IND', name: '🇮🇳 Índia' },
    { code: 'JPN', name: '🇯🇵 Japão' }
  ];

  useEffect(() => {
    loadRealTimeData();
    loadAPIStatus();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      loadRealTimeData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedCountry]);

  const loadRealTimeData = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_ENDPOINTS.HEALTH}?country=${selectedCountry}`);
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAPIStatus = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.HEALTH);
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.apis || []);
      }
    } catch (error) {
      console.error('Error loading API status:', error);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'μg/m³') {
      return `${value.toFixed(1)} μg/m³`;
    }
    if (unit === '°C') {
      return `${value}°C`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return `${value} ${unit}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">🌍 Dados em Tempo Real</h1>
              <p className="text-blue-100">
                Integração com OpenAQ, Open-Meteo, World Bank e outras APIs confiáveis
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Última atualização:</div>
              <div className="font-mono">{lastUpdate}</div>
            </div>
          </div>
        </div>

        {/* Country Selection & Refresh */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-slate-800 text-white p-2 rounded border border-slate-600 focus:ring-2 focus:ring-blue-500"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={loadRealTimeData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
            
            {realTimeData && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Confiabilidade:</span>
                <span className={`font-bold ${
                  realTimeData.reliability_score >= 70 ? 'text-green-400' :
                  realTimeData.reliability_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {realTimeData.reliability_score}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Status das APIs
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {apiStatus.map((api, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  api.success 
                    ? 'bg-green-500/20 border-green-500/30' 
                    : 'bg-red-500/20 border-red-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {getStatusIcon(api.success)}
                      {api.name}
                    </div>
                    <div className="text-sm opacity-75">{api.category}</div>
                  </div>
                  {api.duration && (
                    <div className="text-xs bg-black/20 px-2 py-1 rounded">
                      {api.duration.toFixed(2)}s
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-75">{api.data_type}</div>
                {api.error && (
                  <div className="text-xs text-red-300 mt-1">{api.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Real-Time Data */}
        {realTimeData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Air Quality Data */}
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-green-400">
                🌬️ Qualidade do Ar (Tempo Real)
              </h3>
              
              {realTimeData.consolidated_metrics?.co2_concentration && (
                <div className="mb-4 p-3 bg-green-500/20 rounded">
                  <div className="text-sm text-green-300">Concentração de CO₂</div>
                  <div className="text-2xl font-bold">
                    {realTimeData.consolidated_metrics.co2_concentration.average.toFixed(1)} μg/m³
                  </div>
                  <div className="text-xs text-green-200">
                    Fontes: {realTimeData.consolidated_metrics.co2_concentration.sources.length}
                  </div>
                </div>
              )}
              
              {/* Open-Meteo Data */}
              {realTimeData.air_quality?.open_meteo?.measurements && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-300">Open-Meteo:</div>
                  {Object.entries(realTimeData.air_quality.open_meteo.measurements).map(([key, data]: [string, any]) => (
                    data.value && (
                      <div key={key} className="flex justify-between items-center p-2 bg-blue-500/20 rounded">
                        <span className="text-sm">{String(key).replace('_', ' ').toUpperCase()}</span>
                        <span className="font-mono">{formatValue(data.value, data.unit)}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Economic Data */}
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">
                💰 Dados Econômicos
              </h3>
              
              {realTimeData.economic_data?.data && (
                <div className="space-y-2">
                  {Object.entries(realTimeData.economic_data.data).map(([key, data]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-blue-500/20 rounded">
                      <span className="text-sm">{String(key).replace('_', ' ').toUpperCase()}</span>
                      <div className="text-right">
                        <div className="font-mono">
                          {key === 'gdp_per_capita' ? `$${data.value.toLocaleString()}` :
                           key === 'population' ? `${(data.value / 1000000).toFixed(1)}M` :
                           `${data.value.toFixed(1)}%`}
                        </div>
                        <div className="text-xs opacity-75">({data.year})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weather Data */}
            {realTimeData.weather_data?.weather && (
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">
                  🌤️ Dados Climáticos
                </h3>
                
                <div className="space-y-2">
                  {Object.entries(realTimeData.weather_data.weather).map(([key, data]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-purple-500/20 rounded">
                      <span className="text-sm">{String(key).replace('_', ' ').toUpperCase()}</span>
                      <span className="font-mono">{formatValue(data.value, data.unit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Status Summary */}
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">
                📊 Status das Fontes
              </h3>
              
              <div className="space-y-2">
                {Object.entries(realTimeData.api_status).map(([api, status]) => (
                  <div key={api} className="flex justify-between items-center p-2 bg-yellow-500/20 rounded">
                    <span className="text-sm">{api.toUpperCase()}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      status === 'success' 
                        ? 'bg-green-500/30 text-green-300' 
                        : 'bg-red-500/30 text-red-300'
                    }`}>
                      {status === 'success' ? '✅ ATIVO' : '❌ FALHOU'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-sm text-gray-300">
                  Fontes ativas: {realTimeData.data_sources.join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-4">🌍</div>
            <div className="text-gray-300">Carregando dados em tempo real...</div>
          </div>
        )}

        {/* Footer Info */}
        <div className="bg-white/5 p-4 rounded-lg text-sm text-gray-300">
          <h4 className="font-semibold mb-2">ℹ️ Sobre as Fontes de Dados</h4>
          <ul className="space-y-1">
            <li>• <strong>OpenAQ:</strong> Dados de qualidade do ar em tempo real de estações globais</li>
            <li>• <strong>Open-Meteo:</strong> Medições atmosféricas e concentrações de poluentes</li>
            <li>• <strong>World Bank:</strong> Indicadores econômicos e ambientais oficiais</li>
            <li>• <strong>Copernicus:</strong> Dados de satélite da ESA (em desenvolvimento)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};