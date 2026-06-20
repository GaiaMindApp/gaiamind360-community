import { GlobalAPIsService } from './globalAPIsService';
import { authFetch } from './authFetch';
import { API_BASE } from './apiBaseConfig';

export interface CountryInsight {
  country: string;
  countryCode: string;
  diagnosis: string;
  recommendations: string[];
  policies: PolicyRecommendation[];
  metrics: InsightMetrics;
  sources: string[];
  aiAnalysis?: any;
  forecasts?: Record<string, number>;
  simulations?: PipelineSimulation;
}

export interface PolicyRecommendation {
  title: string;
  description: string;
  impact: string;
  timeline: string;
  investment: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InsightMetrics {
  gdpPerCapita?: number;
  population?: number;
  renewableEnergy?: number;
  co2Emissions?: number;
  forestArea?: number;
  sustainabilityScore: number;
  scoreCurrent?: number;
  scoreNoRisk?: number;
  outlookScore?: number;
  probUp?: number;
  probDown?: number;
  severeProb?: number;
  contributions?: {
    risk?: number;
    forecast?: number;
    drivers?: number;
  };
  forecast?: {
    p10?: number;
    p50?: number;
    p90?: number;
  };
  drivers?: {
    pct_positive?: number;
    pct_negative?: number;
    top_positive?: string[];
    top_negative?: string[];
  };
  signals?: {
    s1_trajectory?: number;
    s2_risk?: number;
    s3_drivers?: number;
    s4_trend?: number;
    s5_severe?: number;
  };
  policyFocus?: string;
  fusionAlert?: string;
  rationaleRisk?: string;
  dataYear?: string;
  dataSource: string;
}

export interface SimulationStep {
  step: number;
  cs_ppo?: number;
  cs_greedy?: number;
  cs_random?: number;
}

export interface PipelineSimulation {
  ppoDelta?: number;
  greedyDelta?: number;
  randomDelta?: number;
  winner?: string;
  episodes?: number;
  steps?: SimulationStep[];
  actions?: {
    ppo?: Record<string, number>;
    greedy?: Record<string, number>;
  };
}

export class InsightsService {
  private static async fetchPipelineCountryData(countryCode: string): Promise<any | null> {
    try {
      const res = await authFetch(`${API_BASE}/insights/country/${countryCode}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[InsightsService] pipeline country fetch failed:', e);
      return null;
    }
  }

  private static async fetchPipelineSimulationData(countryCode: string): Promise<PipelineSimulation | null> {
    try {
      const res = await authFetch(`${API_BASE}/insights/simulation/${countryCode}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        ppoDelta: data.steps?.length ? data.steps[data.steps.length - 1]?.cs_ppo - data.steps[0]?.cs_ppo : undefined,
        greedyDelta: data.steps?.length ? data.steps[data.steps.length - 1]?.cs_greedy - data.steps[0]?.cs_greedy : undefined,
        randomDelta: data.steps?.length ? data.steps[data.steps.length - 1]?.cs_random - data.steps[0]?.cs_random : undefined,
        winner: data.winner,
        episodes: data.episodes,
        steps: data.steps?.map((step: any) => ({
          step: Number(step.step),
          cs_ppo: Number(step.cs_ppo),
          cs_greedy: Number(step.cs_greedy),
          cs_random: Number(step.cs_random),
        })) ?? [],
        actions: data.actions,
      };
    } catch (e) {
      console.warn('[InsightsService] pipeline simulation fetch failed:', e);
      return null;
    }
  }

  private static buildPipelineRecommendations(pipeline: any): string[] {
    const recommendations: string[] = [];
    if (pipeline.strategy?.executive_insight) recommendations.push(pipeline.strategy.executive_insight);
    if (pipeline.strategy?.policy_interpretation) recommendations.push(pipeline.strategy.policy_interpretation);
    if (pipeline.strategy?.key_insight) recommendations.push(pipeline.strategy.key_insight);
    if (pipeline.strategy?.do_not) recommendations.push(`Avoid: ${pipeline.strategy.do_not}`);
    if (pipeline.narrative?.diagnosis) recommendations.push(pipeline.narrative.diagnosis);
    if (pipeline.insight) recommendations.push(pipeline.insight);
    return recommendations.filter((r: string) => !!r).slice(0, 5);
  }

  private static buildPipelinePolicies(pipeline: any): PolicyRecommendation[] {
    const policies: PolicyRecommendation[] = [];
    const policy = pipeline.policy_recommendation || {};
    const expected = policy.expected_impact || {};
    const recommendation = policy.recommendation || {};

    if (policy.urgency || recommendation.phase_early || recommendation.phase_mid) {
      const title = recommendation.phase_early || pipeline.policy_focus || 'Policy Recommendation';
      policies.push({
        title,
        description: policy.rationale || pipeline.strategy?.policy_interpretation || 'Policy recommendation from pipeline analysis.',
        impact: expected.delta_cs_50yr != null ? `Δ CS 50yr: +${expected.delta_cs_50yr.toFixed(3)}` : 'Impact estimated by pipeline',
        timeline: [recommendation.phase_early, recommendation.phase_mid].filter(Boolean).join(' → ') || 'Phase 1 → Phase 2',
        investment: expected.risk_reduction != null ? `Risk reduction: +${expected.risk_reduction.toFixed(3)}` : 'No-risk gain available',
        priority: policy.urgency === 'IMMEDIATE' ? 'high' : policy.urgency === 'HIGH' ? 'high' : policy.urgency === 'LOW' ? 'low' : 'medium',
      });
    }

    if (!policies.length) {
      policies.push({
        title: 'Strategic Policy Package',
        description: 'Pipeline-driven policy guidance for the selected country.',
        impact: 'Based on Cap6 PPO and Cap5 risk analysis',
        timeline: 'Immediate → Medium term',
        investment: 'TBD',
        priority: 'medium',
      });
    }

    return policies;
  }

  private static buildPipelineMetrics(pipeline: any): InsightMetrics {
    return {
      gdpPerCapita: undefined,
      population: undefined,
      renewableEnergy: undefined,
      co2Emissions: undefined,
      forestArea: undefined,
      sustainabilityScore: Math.max(0, Math.min(100, Number(pipeline.score_current ?? 0))),
      scoreCurrent: Number(pipeline.score_current ?? 0),
      scoreNoRisk: Number(pipeline.score_no_risk ?? 0),
      outlookScore: Number(pipeline.outlook_score ?? 0),
      probUp: Number(pipeline.prob_up ?? 0),
      probDown: Number(pipeline.prob_down ?? 0),
      severeProb: Number(pipeline.severe_prob ?? 0),
      contributions: {
        risk: Number(pipeline.contributions?.risk ?? 0),
        forecast: Number(pipeline.contributions?.forecast ?? 0),
        drivers: Number(pipeline.contributions?.drivers ?? 0),
      },
      forecast: {
        p10: Number(pipeline.forecast?.p10 ?? 0),
        p50: Number(pipeline.forecast?.p50 ?? 0),
        p90: Number(pipeline.forecast?.p90 ?? 0),
      },
      drivers: {
        pct_positive: Number(pipeline.drivers?.pct_positive ?? 0),
        pct_negative: Number(pipeline.drivers?.pct_negative ?? 0),
        top_positive: pipeline.drivers?.top_positive ?? [],
        top_negative: pipeline.drivers?.top_negative ?? [],
      },
      signals: {
        s1_trajectory: Number(pipeline.signals?.s1_trajectory ?? 0),
        s2_risk: Number(pipeline.signals?.s2_risk ?? 0),
        s3_drivers: Number(pipeline.signals?.s3_drivers ?? 0),
        s4_trend: Number(pipeline.signals?.s4_trend ?? 0),
        s5_severe: Number(pipeline.signals?.s5_severe ?? 0),
      },
      policyFocus: pipeline.policy_focus,
      fusionAlert: pipeline.fusion_alert,
      rationaleRisk: pipeline.rationale_risk,
      dataYear: String(new Date().getFullYear()),
      dataSource: 'GaiaMind Pipeline (Cap2–Cap7)',
    };
  }

  private static mapPipelineResponseToCountryInsight(pipeline: any, countryCode: string, countryName: string): CountryInsight {
    return {
      country: countryName,
      countryCode,
      diagnosis: pipeline.narrative?.diagnosis || pipeline.strategy?.executive_insight || pipeline.insight || 'Insights pipeline data loaded.',
      recommendations: InsightsService.buildPipelineRecommendations(pipeline),
      policies: InsightsService.buildPipelinePolicies(pipeline),
      metrics: InsightsService.buildPipelineMetrics(pipeline),
      sources: ['GaiaMind Pipeline (outlook.json)'],
      forecasts: {
        p10: Number(pipeline.forecast?.p10 ?? 0),
        p50: Number(pipeline.forecast?.p50 ?? 0),
        p90: Number(pipeline.forecast?.p90 ?? 0),
      },
      simulations: undefined,
    };
  }

  static async generateCountryInsights(
    countryCode: string, countryName: string, lang: 'pt' | 'en' | 'es' | 'fr' = 'pt'
  ): Promise<CountryInsight | null> {
    try {
      const pipelineData = await InsightsService.fetchPipelineCountryData(countryCode);
      if (pipelineData) {
        const insight = InsightsService.mapPipelineResponseToCountryInsight(pipelineData, countryCode, countryName);
        const simulation = await InsightsService.fetchPipelineSimulationData(countryCode);
        if (simulation) insight.simulations = simulation;
        return insight;
      }
    } catch (error) {
      console.warn('[InsightsService] pipeline fetch failed', error);
    }

    try {
      const wbData = await GlobalAPIsService.getWorldBankData(countryCode);
      if (!wbData?.data || Object.keys(wbData.data).length === 0) {
        throw new Error(`No World Bank data for ${countryCode}`);
      }

      const d = wbData.data;
      const metrics: InsightMetrics = {
        gdpPerCapita:    d.gdp_per_capita?.value,
        population:      d.population?.value,
        renewableEnergy: d.renewable_energy?.value,
        co2Emissions:    d.co2_emissions?.value,
        forestArea:      d.forest_area?.value,
        sustainabilityScore: InsightsService.calcScore(d),
        dataYear:  d.gdp_per_capita?.year ?? d.population?.year,
        dataSource: 'World Bank Open Data (live) + GaiaMind Pipeline',
      };

      const [diagnosis, recommendations] = [
        InsightsService.localDiagnosis(countryName, metrics),
        [InsightsService.localRecommendations(countryName, metrics)],
      ];

      return {
        country: countryName,
        countryCode,
        diagnosis,
        recommendations,
        policies: InsightsService.buildPolicies(countryName, metrics),
        metrics,
        sources: ['World Bank Open Data'],
      };
    } catch (error) {
      console.error('InsightsService fallback error:', error);
      return null;
    }
  }

  private static calcScore(d: any): number {
    let score = 50;
    const renewable = d.renewable_energy?.value;
    const forest    = d.forest_area?.value;
    const co2       = d.co2_emissions?.value;
    if (renewable) score += Math.min(renewable * 0.5, 25);
    if (forest)    score += Math.min(forest * 0.3, 15);
    if (co2)       score -= Math.min(co2 * 2, 30);
    return Math.max(0, Math.min(100, score));
  }

  private static buildPolicies(country: string, m: InsightMetrics): PolicyRecommendation[] {
    const policies: PolicyRecommendation[] = [];
    if (m.renewableEnergy !== undefined && m.renewableEnergy < 40)
      policies.push({
        title: 'Energy Transition', priority: 'high', timeline: '2025-2030',
        description: `Scale renewables from ${m.renewableEnergy.toFixed(1)}% to ${Math.ceil(m.renewableEnergy + 25)}%`,
        impact: `~${Math.ceil((40 - m.renewableEnergy) * 0.8)}% reduction in energy sector emissions`,
        investment: `$${Math.ceil((40 - m.renewableEnergy) * 2)}B`,
      });
    if (m.co2Emissions !== undefined && m.co2Emissions > 6)
      policies.push({
        title: 'Carbon Pricing', priority: 'high', timeline: '2025-2027',
        description: 'Progressive carbon tax on large emitters',
        impact: `~${Math.ceil((m.co2Emissions - 4) / m.co2Emissions * 100)}% industrial emission reduction`,
        investment: `$${Math.ceil(m.co2Emissions * 100)}M`,
      });
    if (m.forestArea !== undefined && m.forestArea < 35)
      policies.push({
        title: 'Forest Restoration', priority: 'medium', timeline: '2025-2035',
        description: `Restore ${Math.ceil((40 - m.forestArea) * 10000)} ha of native forest`,
        impact: `${Math.ceil((40 - m.forestArea) * 500)}kt CO2 captured/year`,
        investment: `$${Math.ceil((40 - m.forestArea) * 50)}M`,
      });
    return policies.length > 0 ? policies : [{
      title: 'National Sustainability Strategy', priority: 'medium', timeline: '2025-2030',
      description: 'Integrated plan based on country-specific data',
      impact: 'General improvement in environmental indicators', investment: 'TBD',
    }];
  }

  private static localDiagnosis(country: string, m: InsightMetrics): string {
    const score = m.sustainabilityScore;
    const level = score >= 70 ? 'Performance Sólida' : score >= 40 ? 'Performance Intermediária' : 'Desafio Crítico';
    return `${level}: ${country} regista ${score.toFixed(1)}/100 no índice de sustentabilidade. `
      + `Energia renovável: ${m.renewableEnergy?.toFixed(1) ?? '?'}%. `
      + `Emissões CO2: ${m.co2Emissions?.toFixed(1) ?? '?'} t/capita. `
      + `Cobertura florestal: ${m.forestArea?.toFixed(1) ?? '?'}%.`;
  }

  private static localRecommendations(country: string, m: InsightMetrics): string {
    const recs: string[] = [];
    if (m.renewableEnergy !== undefined && m.renewableEnergy < 40)
      recs.push(`Acelerar transição energética de ${m.renewableEnergy.toFixed(1)}% para meta de 50% renovável.`);
    if (m.co2Emissions !== undefined && m.co2Emissions > 4)
      recs.push(`Implementar precificação de carbono para reduzir ${m.co2Emissions.toFixed(1)} t/capita.`);
    if (m.forestArea !== undefined && m.forestArea < 30)
      recs.push(`Programa de restauração florestal para expandir ${m.forestArea.toFixed(1)}% de cobertura.`);
    return recs.length > 0 ? recs.join(' ') : `Estratégia integrada de sustentabilidade para ${country}.`;
  }
}
