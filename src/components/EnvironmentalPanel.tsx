import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Thermometer, Wind, Droplets, AlertTriangle, Leaf, Zap } from 'lucide-react';

interface EnvironmentalPanelProps {
  country: string;
  latitude: number;
  longitude: number;
}

export function EnvironmentalPanel({ country, latitude, longitude }: EnvironmentalPanelProps) {
  const [loading, setLoading] = useState(true);

  // Mock data generation
  const climateData = {
    temperature: 20 + Math.random() * 15,
    co2Level: 400 + Math.random() * 50,
    airQuality: Math.floor(Math.random() * 300),
    humidity: Math.floor(Math.random() * 100)
  };

  const alerts = Math.random() > 0.7 ? [{
    id: '1',
    severity: 'medium' as const,
    title: 'Qualidade do Ar Moderada',
    description: 'Níveis de poluição ligeiramente elevados'
  }] : [];

  const sustainability = {
    epiScore: 50 + Math.random() * 50,
    renewableEnergy: Math.random() * 100,
    forestCover: Math.random() * 80,
    waterAccess: 70 + Math.random() * 30
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [country]);

  if (loading) {
    return (
      <div className="bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg">
        <div className="animate-pulse">Carregando dados ambientais...</div>
      </div>
    );
  }

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'text-green-400';
    if (aqi <= 100) return 'text-yellow-400';
    if (aqi <= 150) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md text-white p-6 rounded-xl shadow-2xl border border-white/10 max-w-sm"
    >
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          {country}
        </h3>
        <p className="text-sm text-white/60">Dados Ambientais em Tempo Real</p>
      </div>

      {/* Indicadores Climáticos */}
      {!loading && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center justify-center gap-2">
              <Thermometer className="w-5 h-5 text-red-400" />
              Indicadores Climáticos
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 p-4 rounded-xl text-center">
              <Thermometer className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{climateData.temperature.toFixed(1)}°C</div>
              <div className="text-xs text-red-300">Temperatura</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-4 rounded-xl text-center">
              <Wind className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${getAQIColor(climateData.airQuality)}`}>
                {climateData.airQuality.toFixed(0)}
              </div>
              <div className="text-xs text-blue-300">AQI</div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 p-4 rounded-xl text-center">
              <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-400">{climateData.co2Level.toFixed(0)}</div>
              <div className="text-xs text-yellow-300">ppm CO₂</div>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 p-4 rounded-xl text-center">
              <Droplets className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-cyan-400">{climateData.humidity}%</div>
              <div className="text-xs text-cyan-300">Umidade</div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas Ambientais */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Alertas Ambientais
            </h4>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="bg-gradient-to-r from-yellow-500/20 to-red-500/20 border border-yellow-500/40 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${getSeverityColor(alert.severity)}`}>
                      {alert.title}
                    </div>
                    <div className="text-white/80 text-xs mt-1">{alert.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas de Sustentabilidade */}
      {!loading && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center justify-center gap-2">
              <Leaf className="w-5 h-5 text-green-400" />
              Índices de Sustentabilidade
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-400">{sustainability.epiScore.toFixed(0)}</div>
              <div className="text-xs text-green-300">EPI Score</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400">{sustainability.renewableEnergy.toFixed(0)}%</div>
              <div className="text-xs text-blue-300">Energia Limpa</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-emerald-400">{sustainability.forestCover.toFixed(0)}%</div>
              <div className="text-xs text-emerald-300">Florestas</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-cyan-400">{sustainability.waterAccess.toFixed(0)}%</div>
              <div className="text-xs text-cyan-300">Acesso Água</div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-white/50 text-center">
        Dados simulados para demonstração
      </div>
    </motion.div>
  );
}