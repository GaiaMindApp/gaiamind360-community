export interface ClimateData {
  temperature: number;
  co2Level: number;
  airQuality: number;
  humidity: number;
  precipitation: number;
  pressure: number;
}

export interface EnvironmentalAlert {
  id: string;
  type: 'wildfire' | 'hurricane' | 'drought' | 'flood' | 'earthquake' | 'weather';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  country: string;
  coordinates: [number, number];
  timestamp: Date;
  active: boolean;
}

export interface SustainabilityMetrics {
  epiScore: number;
  carbonFootprint: number;
  renewableEnergy: number;
  forestCover: number;
  biodiversityIndex: number;
  waterAccess: number;
  wasteManagement: number;
  urbanPollution: number;
}

export interface EnvironmentalPolicies {
  parisAgreement: boolean;
  carbonNeutralityTarget: number | null;
  environmentalLaws: number;
  greenSubsidies: number;
  sustainabilityRank: number;
}

export interface PredictionData {
  temperature7Day: number[];
  disasterRisk: number;
  pollutionTrend: 'increasing' | 'stable' | 'decreasing';
  biodiversityThreat: number;
  recommendations: string[];
}

export interface CountryComparison {
  countries: string[];
  metrics: Record<string, number[]>;
  rankings: Record<string, number[]>;
}