import { useState } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { X, Download, Share2 } from 'lucide-react';

interface PolicySimulationResultsProps {
  data: any;
  onClose: () => void;
}

export function PolicySimulationResults({ data, onClose }: PolicySimulationResultsProps) {
  const [activeTab, setActiveTab] = useState('timeline');

  if (!data) return null;

  // Preparar dados para gráfico de linha
  const timelineData = data.forecast_data.co2.baseline.map((item: any, idx: number) => ({
    year: item.year,
    co2_baseline: item.value,
    co2_policy: data.forecast_data.co2.with_policy[idx].value,
    renewable_baseline: data.forecast_data.renewable.baseline[idx].value,
    renewable_policy: data.forecast_data.renewable.with_policy[idx].value,
  }));

  // Preparar dados para radar
  const radarData = [
    { metric: 'CO₂', baseline: data.before_metrics.co2, policy: data.after_metrics.co2 },
    { metric: 'Renovável', baseline: data.before_metrics.renewable, policy: data.after_metrics.renewable },
    { metric: 'Temperatura', baseline: data.before_metrics.temperature, policy: data.after_metrics.temperature },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-[#003049] to-[#001a2a] border border-[#00E676]/30 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#003049]/95 border-b border-[#00E676]/20 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-[#00E676] text-2xl font-bold">{data.country}</h2>
            <p className="text-[#E0F7FA]/60 text-sm">Simulação de Política Ambiental</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#003049]/60 border border-[#00E676]/20 p-4 rounded-lg">
              <div className="text-[#E0F7FA]/60 text-sm mb-2">Redução CO₂</div>
              <div className="text-[#00E676] text-2xl font-bold">{data.impact_percent.co2_reduction_pct}%</div>
              <div className="text-xs text-[#E0F7FA]/40 mt-1">até 2050</div>
            </div>
            <div className="bg-[#003049]/60 border border-[#00E676]/20 p-4 rounded-lg">
              <div className="text-[#E0F7FA]/60 text-sm mb-2">Energia Renovável</div>
              <div className="text-[#00E676] text-2xl font-bold">+{data.impact_percent.renewable_increase_pct}%</div>
              <div className="text-xs text-[#E0F7FA]/40 mt-1">crescimento</div>
            </div>
            <div className="bg-[#003049]/60 border border-[#00E676]/20 p-4 rounded-lg">
              <div className="text-[#E0F7FA]/60 text-sm mb-2">Redução Temperatura</div>
              <div className="text-[#00E676] text-2xl font-bold">{data.impact_percent.temp_reduction_celsius}°C</div>
              <div className="text-xs text-[#E0F7FA]/40 mt-1">até 2050</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#00E676]/20">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'timeline'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-[#E0F7FA]/60 hover:text-[#E0F7FA]'
              }`}
            >
              📈 Timeline
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'comparison'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-[#E0F7FA]/60 hover:text-[#E0F7FA]'
              }`}
            >
              🎯 Comparação
            </button>
            <button
              onClick={() => setActiveTab('insight')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'insight'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-[#E0F7FA]/60 hover:text-[#E0F7FA]'
              }`}
            >
              🧠 Análise IA
            </button>
          </div>

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="bg-[#003049]/40 p-4 rounded-lg">
              <h3 className="text-[#00E676] mb-4 font-semibold">Projeção 2024-2050</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <XAxis dataKey="year" stroke="#E0F7FA" />
                  <YAxis stroke="#E0F7FA" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#003049',
                      border: '1px solid #00E676',
                      borderRadius: '8px',
                      color: '#E0F7FA'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#E0F7FA' }} />
                  <Line type="monotone" dataKey="co2_baseline" stroke="#FFD54F" name="CO₂ Baseline" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="co2_policy" stroke="#00E676" name="CO₂ Com Política" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && (
            <div className="bg-[#003049]/40 p-4 rounded-lg">
              <h3 className="text-[#00E676] mb-4 font-semibold">Antes vs Depois</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarAngleAxis dataKey="metric" stroke="#E0F7FA" />
                  <PolarRadiusAxis stroke="#E0F7FA" />
                  <Radar name="Baseline" dataKey="baseline" stroke="#FFD54F" fill="#FFD54F" fillOpacity={0.3} />
                  <Radar name="Com Política" dataKey="policy" stroke="#00E676" fill="#00E676" fillOpacity={0.3} />
                  <Legend wrapperStyle={{ color: '#E0F7FA' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Insight Tab */}
          {activeTab === 'insight' && (
            <div className="bg-[#003049]/40 p-4 rounded-lg border border-[#00E676]/20">
              <h3 className="text-[#00E676] mb-4 font-semibold">🧠 Análise GaiaMind</h3>
              <p className="text-[#E0F7FA] leading-relaxed whitespace-pre-wrap">{data.ai_insight}</p>
            </div>
          )}

          {/* Métricas Detalhadas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#003049]/60 border border-[#00E676]/20 p-4 rounded-lg">
              <h4 className="text-[#E0F7FA] font-semibold mb-3">Cenário Atual</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">CO₂:</span>
                  <span className="text-[#FFD54F]">{data.before_metrics.co2} Gt/ano</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">Renovável:</span>
                  <span className="text-[#FFD54F]">{data.before_metrics.renewable}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">Temperatura:</span>
                  <span className="text-[#FFD54F]">{data.before_metrics.temperature}°C</span>
                </div>
              </div>
            </div>

            <div className="bg-[#003049]/60 border border-[#00E676]/20 p-4 rounded-lg">
              <h4 className="text-[#E0F7FA] font-semibold mb-3">Com Política (2050)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">CO₂:</span>
                  <span className="text-[#00E676]">{data.after_metrics.co2} Gt/ano</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">Renovável:</span>
                  <span className="text-[#00E676]">{data.after_metrics.renewable}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E0F7FA]/60">Temperatura:</span>
                  <span className="text-[#00E676]">{data.after_metrics.temperature}°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-[#00E676]/20">
            <button className="flex-1 bg-[#00E676] text-[#003049] hover:bg-[#00E676]/90 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
            <button className="flex-1 bg-[#003049]/60 border border-[#00E676]/30 text-[#E0F7FA] hover:bg-[#003049]/80 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
