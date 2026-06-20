import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, TrendingUp, AlertCircle, Target } from 'lucide-react';
import { PredictionData } from '../types/environmental';
import { environmentalService } from '../services/environmentalService';

interface PredictiveAnalysisProps {
  country: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PredictiveAnalysis({ country, isOpen, onClose }: PredictiveAnalysisProps) {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '2030' | '2050'>('7d');

  useEffect(() => {
    if (isOpen && country) {
      loadPredictions();
    }
  }, [isOpen, country, timeframe]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const data = await environmentalService.getPredictions(country);
      setPredictions(data);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-400';
    if (risk < 60) return 'text-yellow-400';
    if (risk < 80) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'decreasing': return 'text-green-400';
      case 'stable': return 'text-yellow-400';
      case 'increasing': return 'text-red-400';
      default: return 'text-gray-400';
    }
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
        className="bg-black/90 backdrop-blur-sm text-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Análise Preditiva IA - {country}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            ×
          </button>
        </div>

        {/* Timeframe Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Período de Análise</h3>
          <div className="flex gap-2">
            {[
              { key: '7d', label: '7 Dias' },
              { key: '30d', label: '30 Dias' },
              { key: '2030', label: '2030' },
              { key: '2050', label: '2050' }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setTimeframe(option.key as any)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  timeframe === option.key 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white/60">Processando análise preditiva...</p>
          </div>
        ) : predictions ? (
          <div className="space-y-6">
            {/* Temperature Prediction */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                Predição de Temperatura (próximos 7 dias)
              </h3>
              <div className="flex items-end gap-1 h-20">
                {predictions.temperature7Day.map((temp, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="bg-red-400 w-full rounded-t"
                      style={{ height: `${(temp / Math.max(...predictions.temperature7Day)) * 100}%` }}
                    />
                    <div className="text-xs mt-1">{temp.toFixed(0)}°</div>
                    <div className="text-xs text-white/60">D{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  Risco de Desastres
                </h4>
                <div className={`text-2xl font-bold ${getRiskColor(predictions.disasterRisk)}`}>
                  {predictions.disasterRisk.toFixed(0)}%
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {predictions.disasterRisk < 30 ? 'Baixo' : 
                   predictions.disasterRisk < 60 ? 'Moderado' : 
                   predictions.disasterRisk < 80 ? 'Alto' : 'Crítico'}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Tendência de Poluição</h4>
                <div className={`text-lg font-bold ${getTrendColor(predictions.pollutionTrend)}`}>
                  {predictions.pollutionTrend === 'increasing' ? '↗️ Aumentando' :
                   predictions.pollutionTrend === 'stable' ? '➡️ Estável' : '↘️ Diminuindo'}
                </div>
              </div>
            </div>

            {/* Biodiversity Threat */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Ameaça à Biodiversidade</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-full h-3">
                  <div 
                    className={`h-full rounded-full ${
                      predictions.biodiversityThreat < 30 ? 'bg-green-400' :
                      predictions.biodiversityThreat < 60 ? 'bg-yellow-400' :
                      predictions.biodiversityThreat < 80 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${predictions.biodiversityThreat}%` }}
                  />
                </div>
                <span className="text-sm">{predictions.biodiversityThreat.toFixed(0)}%</span>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-4 rounded-lg border border-purple-500/30">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Recomendações da IA Gaia
              </h4>
              <div className="space-y-2">
                {predictions.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Modeling */}
            {timeframe === '2030' || timeframe === '2050' ? (
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Cenários Climáticos {timeframe}</h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">Otimista</div>
                    <div className="text-white/60">+1.2°C</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">Moderado</div>
                    <div className="text-white/60">+2.1°C</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">Pessimista</div>
                    <div className="text-white/60">+3.5°C</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center text-white/60 py-8">
            Erro ao carregar predições
          </div>
        )}

        <button
          onClick={loadPredictions}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm transition-colors"
        >
          Atualizar Análise
        </button>
      </motion.div>
    </motion.div>
  );
}