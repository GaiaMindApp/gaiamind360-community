/**
 * Hybrid AI Enrichment Service
 * Usa AIOrchestrator para fallback automático em cascata
 */

import { AIOrchestrator, AIModel } from './aiOrchestrator';

export interface HybridEnrichmentRequest {
  technicalSummary: string;
  country: string;
  dataSource: string;
  metrics: any;
  queryType: 'co2_analysis' | 'trend' | 'comparison' | 'general';
}

export interface HybridEnrichmentResponse {
  enrichedResponse: string;
  confidence: number;
  dataQuality: 'real' | 'estimated';
  provider: string;
}

export class HybridAIEnrichment {
  private static initialized = false;

  /**
   * Inicializa orquestrador com modelos em cascata
   */
  static initialize(): void {
    if (this.initialized) return;

    const models: AIModel[] = [
      {
        name: 'Gemma 7B',
        timeout: 45000,
        handler: (prompt) => AIOrchestrator.handleGemma(prompt)
      },
      {
        name: 'Mistral 7B',
        timeout: 25000,
        handler: (prompt) => AIOrchestrator.handleMistral(prompt)
      },
      {
        name: 'Qwen 7B',
        timeout: 20000,
        handler: (prompt) => AIOrchestrator.handleQwen(prompt)
      },
      {
        name: 'Phi-3 Mini',
        timeout: 10000,
        handler: (prompt) => AIOrchestrator.handlePhi3(prompt)
      },
      {
        name: 'TinyLlama',
        timeout: 5000,
        handler: (prompt) => AIOrchestrator.handleTinyLlama(prompt)
      }
    ];

    AIOrchestrator.registerModels(models);
    this.initialized = true;
  }

  /**
   * Enriquece resposta com fallback automático
   */
  static async enrichResponse(request: HybridEnrichmentRequest): Promise<HybridEnrichmentResponse> {
    this.initialize();

    try {
      const prompt = AIOrchestrator.buildStandardPrompt(request.technicalSummary);
      const result = await AIOrchestrator.orchestrate(prompt, request.technicalSummary);

      return {
        enrichedResponse: result.response,
        confidence: result.success ? 0.95 : 0.7,
        dataQuality: request.dataSource === 'World Bank API' ? 'real' : 'estimated',
        provider: `${result.model} (${result.timeMs}ms)`
      };
    } catch (error) {
      console.error('Erro crítico em enriquecimento:', error);
      return {
        enrichedResponse: request.technicalSummary,
        confidence: 0.7,
        dataQuality: request.dataSource === 'World Bank API' ? 'real' : 'estimated',
        provider: 'Technical (Emergency Fallback)'
      };
    }
  }

  /**
   * Enriquece análise de CO2
   */
  static async enrichCO2Analysis(
    country: string,
    co2Data: any,
    trend: string,
    dataSource: string
  ): Promise<string> {
    const co2Value = typeof co2Data.co2_per_capita === 'number' ? co2Data.co2_per_capita : parseFloat(co2Data.co2_per_capita) || 0;
    const changePct = typeof co2Data.change_pct === 'number' ? co2Data.change_pct : parseFloat(co2Data.change_pct) || 0;
    const rSquared = typeof co2Data.r_squared === 'number' ? co2Data.r_squared : parseFloat(co2Data.r_squared) || 0;

    const technicalSummary = `
Análise de CO2 para ${country}:
- Período: ${co2Data.start_year} - ${co2Data.end_year}
- Emissões per capita: ${co2Value.toFixed(2)} t/capita
- Mudança: ${changePct.toFixed(1)}%
- Tendência: ${trend}
- R² (confiabilidade): ${rSquared.toFixed(3)}
- Interpretação: ${co2Data.interpretation || 'Análise em progresso'}
`;

    const request: HybridEnrichmentRequest = {
      technicalSummary,
      country,
      dataSource,
      metrics: { co2_per_capita: co2Value },
      queryType: 'co2_analysis'
    };

    const response = await this.enrichResponse(request);
    return response.enrichedResponse;
  }

  /**
   * Enriquece comparação
   */
  static async enrichComparison(
    countries: string[],
    comparisonData: any,
    dataSource: string
  ): Promise<string> {
    const technicalSummary = `
Comparação de CO2 entre ${countries.join(', ')}:
${comparisonData.map((c: any) => {
  const val = typeof c.co2_per_capita === 'number' ? c.co2_per_capita : parseFloat(c.co2_per_capita) || 0;
  return `- ${c.country}: ${val.toFixed(2)} t/capita`;
}).join('\n')}
`;

    const request: HybridEnrichmentRequest = {
      technicalSummary,
      country: countries.join(' vs '),
      dataSource,
      metrics: { countries },
      queryType: 'comparison'
    };

    const response = await this.enrichResponse(request);
    return response.enrichedResponse;
  }

  /**
   * Enriquece tendência
   */
  static async enrichTrend(
    country: string,
    trendData: any,
    dataSource: string
  ): Promise<string> {
    const technicalSummary = `
Tendência ambiental para ${country}:
- Métrica: ${trendData.metric}
- Valor atual: ${trendData.current_value}
- Valor anterior: ${trendData.previous_value}
- Mudança: ${trendData.change}%
- Direção: ${trendData.direction}
- Período: ${trendData.period}
`;

    const request: HybridEnrichmentRequest = {
      technicalSummary,
      country,
      dataSource,
      metrics: trendData,
      queryType: 'trend'
    };

    const response = await this.enrichResponse(request);
    return response.enrichedResponse;
  }
}
