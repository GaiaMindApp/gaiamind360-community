import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, CheckCircle, XCircle, Satellite, Globe, Target } from 'lucide-react';
import { GlobalAPIsService } from '../services/globalAPIsService';

export const APITestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]); // Limpar resultados anteriores
    
    try {
      console.log('Iniciando testes de API...');
      const testResults = await GlobalAPIsService.testAPIsConnectivity();
      console.log('Resultados dos testes:', testResults);
      setResults(testResults);
    } catch (error) {
      console.error('Error running API tests:', error);
      setResults([{
        name: 'Erro Geral',
        success: false,
        duration: 0,
        error: 'Falha ao executar testes'
      }]);
    } finally {
      setTesting(false);
    }
  };

  const getIcon = (name: string) => {
    if (name.includes('EONET') || name.includes('APOD')) return <Satellite className="w-4 h-4" />;
    if (name.includes('World Bank')) return <Globe className="w-4 h-4" />;
    if (name.includes('UNEP')) return <Target className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border-2 border-green-500 shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          🔧 Teste de Conectividade APIs
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 p-6 bg-white">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testando APIs...
            </>
          ) : (
            'Testar Conectividade'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Resultados:</h3>
            
            {results.map((result, index) => (
              <Card key={index} className="bg-gray-50 border-2 border-gray-200 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600">{getIcon(result.name)}</div>
                      <div>
                        <h4 className="font-medium text-gray-800">{result.name}</h4>
                        <p className="text-sm text-gray-600">
                          Tempo: {result.duration}ms
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Online
                          </Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <Badge className="bg-red-100 text-red-800 border-red-300">
                            Offline
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {result.result && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700 font-mono">
                      Dados recebidos: {JSON.stringify(result.result).substring(0, 100)}...
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="font-semibold text-blue-800 mb-2">📊 Informações das APIs:</p>
          <p>• <strong>Copernicus Sentinel:</strong> Imagens de satélite da Terra em tempo real (resolução 10m)</p>
          <p>• <strong>World Bank API:</strong> Indicadores socioeconômicos globais</p>
          <p>• <strong>UNEP SDG API:</strong> Objetivos de Desenvolvimento Sustentável</p>
        </div>
      </CardContent>
    </Card>
  );
};