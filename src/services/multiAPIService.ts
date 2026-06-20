/**
 * GaiaMind Multi-API Service
 * © 2025 - Frontend service for resilient data integration
 */

import { API_BASE } from './apiBaseConfig';

export interface ResilientCountryData {
  country_code: string;
  data_sources: string[];
  economic_data: {
    gdp_per_capita?: { value: number; year: string; unit: string };
    population?: { value: number; year: string; unit: string };
    unemployment?: { value: number; year: string; unit: string };
  };
  environmental_data: {
    co2_emissions?: { value: number; year: string; unit: string };
    renewable_energy?: { value: number; year: string; unit: string };
    forest_area?: { value: number; year: string; unit: string };
  };
  climate_data: {
    temperature?: { value: number; unit: string };
    humidity?: { value: number; unit: string };
    air_quality?: { value: number; unit: string };
  };
  reliability_score: number;
  timestamp: string;
}

export interface APITestResult {
  category: string;
  name: string;
  success: boolean;
  duration?: number;
  error?: string;
  priority: number;
}

export interface GlobalSummary {
  timestamp: string;
  countries_analyzed: number;
  data_sources: string[];
  global_metrics: {
    avg_gdp_per_capita: number;
    total_population: number;
    avg_co2_emissions: number;
    avg_renewable_energy: number;
  };
  countries: ResilientCountryData[];
}

export class MultiAPIService {
  private static BACKEND_URL = `${API_BASE}/multi-data`;

  /**
   * Testa conectividade com todas as APIs
   */
  static async testAllAPIs(): Promise<{
    summary: { total_apis: number; successful: number; success_rate: number };
    by_category: Record<string, APITestResult[]>;
    all_results: APITestResult[];
  }> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/test-all-apis`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('API test error:', error);
      return {
        summary: { total_apis: 0, successful: 0, success_rate: 0 },
        by_category: {},
        all_results: []
      };
    }
  }

  /**
   * Busca dados resilientes de um país
   */
  static async getCountryResilientData(countryCode: string): Promise<ResilientCountryData | null> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/country/${countryCode}/resilient`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching resilient data for ${countryCode.replace(/[\r\n]/g, ' ')}:`, error);
      return null;
    }
  }

  /**
   * Busca resumo global
   */
  static async getGlobalSummary(): Promise<GlobalSummary | null> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/global-summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Global summary error:', error);
      return null;
    }
  }

  /**
   * Busca dados de múltiplos países em lote
   */
  static async getCountriesBatch(countries: string[]): Promise<{
    successful: number;
    failed: number;
    countries: ResilientCountryData[];
    errors: Array<{ country_code: string; error: string }>;
  }> {
    try {
      const safeCountries = countriesParam.replace(/[\r\n]/g, ' ').slice(0, 200);
      const response = await authFetch(`${this.BACKEND_URL}/countries/batch?countries=${safeCountries}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Batch countries error:', error);
      return { successful: 0, failed: countries.length, countries: [], errors: [] };
    }
  }

  /**
   * Compara dois países
   */
  static async compareCountries(country1: string, country2: string): Promise<{
    countries: Record<string, ResilientCountryData>;
    comparison: {
      gdp_ratio?: number;
      gdp_difference?: number;
      co2_ratio?: number;
      co2_difference?: number;
      renewable_difference?: number;
    };
    timestamp: string;
  } | null> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/compare/${country1}/${country2}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error comparing ${country1.replace(/[\r\n]/g, ' ')} vs ${country2.replace(/[\r\n]/g, ' ')}:`, error);
      return null;
    }
  }

  /**
   * Verifica saúde do sistema
   */
  static async healthCheck(): Promise<{
    status: string;
    multi_api_service?: string;
    test_reliability_score?: number;
    available_sources?: string[];
    error?: string;
    fallback_available?: boolean;
  }> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/health-check`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'error', error: 'Backend not available' };
    }
  }

  /**
   * Status das fontes de dados
   */
  static async getSourcesStatus(): Promise<{
    total_sources: number;
    by_priority: Record<number, APITestResult[]>;
    recommendations: {
      primary_sources: APITestResult[];
      backup_sources: APITestResult[];
      failed_sources: APITestResult[];
    };
  } | null> {
    try {
      const response = await authFetch(`${this.BACKEND_URL}/sources/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Sources status error:', error);
      return null;
    }
  }

  /**
   * Formata valores para exibição
   */
  static formatValue(value: number, unit: string): string {
    if (unit === 'USD' || unit.includes('$')) {
      return `$${value.toLocaleString()}`;
    }
    if (unit === 'people') {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'tons CO2') {
      return `${value.toFixed(1)} tons`;
    }
    if (unit === '°C') {
      return `${value}°C`;
    }
    return `${value} ${unit}`;
  }

  /**
   * Calcula score de confiabilidade em texto
   */
  static getReliabilityText(score: number): { text: string; color: string } {
    if (score >= 80) return { text: 'Excelente', color: 'text-green-600' };
    if (score >= 60) return { text: 'Boa', color: 'text-blue-600' };
    if (score >= 40) return { text: 'Moderada', color: 'text-yellow-600' };
    if (score >= 20) return { text: 'Baixa', color: 'text-orange-600' };
    return { text: 'Muito Baixa', color: 'text-red-600' };
  }

  /**
   * Obtém cor para métricas ambientais
   */
  static getEnvironmentalColor(metric: string, value: number): string {
    switch (metric) {
      case 'co2_emissions':
        if (value < 2) return 'text-green-600';
        if (value < 5) return 'text-yellow-600';
        if (value < 10) return 'text-orange-600';
        return 'text-red-600';
      
      case 'renewable_energy':
        if (value > 50) return 'text-green-600';
        if (value > 25) return 'text-blue-600';
        if (value > 10) return 'text-yellow-600';
        return 'text-red-600';
      
      case 'forest_area':
        if (value > 50) return 'text-green-600';
        if (value > 30) return 'text-blue-600';
        if (value > 15) return 'text-yellow-600';
        return 'text-red-600';
      
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Cache simples para evitar requisições desnecessárias
   */
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * Limpa cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}