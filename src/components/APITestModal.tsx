import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Satellite, Globe, Target, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { API_ENDPOINTS } from '../services/apiConfigComplete';

interface APITestModalProps {
  onClose: () => void;
}

export function APITestModal({ onClose }: APITestModalProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const testAPIsViaBackend = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.GLOBAL_DATA.TEST_CONNECTIVITY, {
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      return result.results || [];
    } catch (error) {
      return [{
        name: 'Backend Connection',
        success: false,
        duration: 0,
        error: 'Backend não está rodando. Execute: cd backend && python start.py'
      }];
    }
  };

  const runAllTests = async () => {
    setShowResults(true);
    setTesting(true);
    setResults([]);

    const apiConfig = [
      { name: 'Copernicus Sentinel', icon: Satellite, color: 'from-blue-500 to-cyan-500' },
      { name: 'World Bank', icon: Globe, color: 'from-green-500 to-emerald-500' },
      { name: 'UNEP SDG', icon: Target, color: 'from-purple-500 to-pink-500' }
    ];

    const backendResults = await testAPIsViaBackend();
    
    const formattedResults = backendResults.map((result: any, index: number) => ({
      name: `🛰️ ${result.name}`,
      icon: apiConfig[Math.min(index, 2)].icon,
      color: apiConfig[Math.min(index, 2)].color,
      success: result.success,
      duration: result.duration,
      data: result.result || (result.data ? JSON.stringify(result.data, null, 2) : null),
      error: result.error
    }));

    setResults(formattedResults);
    setTesting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 via-[#001F3F] to-black border border-white/20 rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <Satellite className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-['Orbitron']">
                🔧 Teste de Conectividade APIs
              </h2>
              <p className="text-white/60 text-sm">
                {showResults ? 'Resultados dos testes' : 'Verificar status das APIs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showResults && (
              <button
                onClick={() => setShowResults(false)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-all text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            {!showResults && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {!showResults ? (
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{maxHeight: 'calc(90vh - 200px)'}}>
            <h3 className="text-white mb-6 text-lg font-medium text-center">
              Selecione para Iniciar o Teste de Conectividade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-2xl border border-white/20">
                <div className="flex flex-col items-center text-center">
                  <Satellite className="w-12 h-12 text-white mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">Copernicus Sentinel</h4>
                  <p className="text-white/80 text-sm">Imagens de satélite da Terra em tempo real (resolução 10m)</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-6 rounded-2xl border border-white/20">
                <div className="flex flex-col items-center text-center">
                  <Globe className="w-12 h-12 text-white mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">World Bank API</h4>
                  <p className="text-white/80 text-sm">Indicadores socioeconômicos globais</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-2xl border border-white/20">
                <div className="flex flex-col items-center text-center">
                  <Target className="w-12 h-12 text-white mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">UNEP SDG API</h4>
                  <p className="text-white/80 text-sm">Objetivos de Desenvolvimento Sustentável</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={runAllTests}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              🚀 Iniciar Teste de Conectividade
            </button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{maxHeight: 'calc(90vh - 200px)'}}>
            {testing && results.length < 3 && (
              <div className="flex items-center justify-center gap-3 text-white mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Testando APIs...</span>
              </div>
            )}
            
            <div className="space-y-4">
              {results.map((result, index) => {
                const IconComponent = result.icon;
                return (
                  <div key={index} className={`bg-gradient-to-r ${result.color} rounded-xl p-4 border border-white/20`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-8 h-8 text-white" />
                        <div>
                          <h4 className="font-bold text-white text-lg">{result.name}</h4>
                          <p className="text-white/80 text-sm">Tempo: {result.duration}ms</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-white" />
                            <span className="font-bold text-white">ONLINE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-white" />
                            <span className="font-bold text-white">OFFLINE</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {result.success && result.data && (
                      <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                        <p className="text-white/90 text-sm font-semibold mb-2">Dados recebidos:</p>
                        <div className="bg-slate-900 rounded p-3 max-h-64 overflow-y-auto">
                          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
{result.data}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {!result.success && result.error && (
                      <div className="bg-red-500/20 rounded-lg p-3 border border-red-400/30">
                        <p className="text-red-200 text-sm"><strong>Erro:</strong> {result.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
