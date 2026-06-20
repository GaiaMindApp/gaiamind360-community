import { ClimateData, EnvironmentalAlert, SustainabilityMetrics, PredictionData } from '../types/environmental';

class EnvironmentalService {
  // URL base fixa como constante estática — não pode ser sobrescrita em runtime (CWE-918)
  private static readonly WEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
  private readonly apiKey = import.meta.env.VITE_WEATHER_API_KEY || '';

  // 1. Indicadores Climáticos em Tempo Real
  async getClimateData(lat: number, lon: number): Promise<ClimateData> {
    try {
      // Validar coordenadas antes de usar na URL (CWE-918)
      const safeLat = Math.max(-90,  Math.min(90,  Number(lat)));
      const safeLon = Math.max(-180, Math.min(180, Number(lon)));
      if (!isFinite(safeLat) || !isFinite(safeLon)) return this.getMockClimateData();

      const response = await authFetch(
        `${EnvironmentalService.WEATHER_BASE}/weather?lat=${safeLat}&lon=${safeLon}&appid=${encodeURIComponent(this.apiKey)}&units=metric`
      );
      const data = await response.json();
      
      return {
        temperature: data.main?.temp || 20 + Math.random() * 15,
        co2Level: 400 + Math.random() * 50,
        airQuality: Math.floor(Math.random() * 300),
        humidity: data.main?.humidity || Math.floor(Math.random() * 100),
        precipitation: Math.random() * 10,
        pressure: data.main?.pressure || 1013 + Math.random() * 50
      };
    } catch {
      return this.getMockClimateData();
    }
  }

  // 2. Emergências Ambientais Ativas
  async getActiveAlerts(country: string): Promise<EnvironmentalAlert[]> {
    const mockAlerts: EnvironmentalAlert[] = [
      {
        id: '1',
        type: 'wildfire',
        severity: 'high',
        title: 'Incêndio Florestal Ativo',
        description: 'Grande incêndio detectado na região',
        country,
        coordinates: [Math.random() * 180 - 90, Math.random() * 360 - 180],
        timestamp: new Date(),
        active: Math.random() > 0.7
      }
    ];
    return mockAlerts.filter(alert => alert.active);
  }

  // 3. Dados de Sustentabilidade
  async getSustainabilityMetrics(country: string): Promise<SustainabilityMetrics> {
    return {
      epiScore: 50 + Math.random() * 50,
      carbonFootprint: Math.random() * 20,
      renewableEnergy: Math.random() * 100,
      forestCover: Math.random() * 80,
      biodiversityIndex: Math.random() * 100,
      waterAccess: 70 + Math.random() * 30,
      wasteManagement: Math.random() * 100,
      urbanPollution: Math.random() * 200
    };
  }

  // 6. Sistema de Alertas Inteligentes
  async getPredictions(country: string): Promise<PredictionData> {
    return {
      temperature7Day: Array.from({length: 7}, () => 15 + Math.random() * 20),
      disasterRisk: Math.random() * 100,
      pollutionTrend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)] as any,
      biodiversityThreat: Math.random() * 100,
      recommendations: [
        'Implementar políticas de energia renovável',
        'Reduzir emissões de carbono em 20%',
        'Investir em reflorestamento'
      ]
    };
  }

  private getMockClimateData(): ClimateData {
    return {
      temperature: 20 + Math.random() * 15,
      co2Level: 400 + Math.random() * 50,
      airQuality: Math.floor(Math.random() * 300),
      humidity: Math.floor(Math.random() * 100),
      precipitation: Math.random() * 10,
      pressure: 1013 + Math.random() * 50
    };
  }
}

export const environmentalService = new EnvironmentalService();