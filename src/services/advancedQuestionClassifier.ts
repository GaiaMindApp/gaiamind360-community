/**
 * Advanced Question Classifier - Classificação robusta com confiança
 */

export enum QuestionType {
  CONCEPTUAL = 'CONCEPTUAL',
  FACTUAL_TEMPORAL = 'FACTUAL_TEMPORAL',
  FACTUAL_GLOBAL = 'FACTUAL_GLOBAL',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassificationResult {
  type: QuestionType;
  confidence: number;
  keywords: string[];
  suggestedDataSource?: string;
}

export class AdvancedQuestionClassifier {
  private static readonly TEMPORAL_KEYWORDS = [
    'últimos', 'anos', '2024', '2023', '2022', '2021', '2020', '2019', '2018',
    'evoluiu', 'evolução', 'mudou', 'aumentou', 'diminuiu', 'cresceu', 'caiu',
    'tendência', 'trend', 'histórico', 'ao longo', 'período', 'década',
    'progressão', 'variação', 'mudança', 'transformação'
  ];

  private static readonly GLOBAL_KEYWORDS = [
    'mundo', 'planeta', 'global', 'internacional', 'países', 'nações',
    'terra', 'humanidade', 'população mundial', 'escala global', 'em todo',
    'universalmente', 'mundialmente', 'globalmente'
  ];

  private static readonly CONCEPTUAL_KEYWORDS = [
    'o que é', 'como funciona', 'explica', 'defina', 'diferença',
    'por que', 'significado', 'teoria', 'conceito', 'princípio',
    'qual é', 'quais são', 'descreva', 'qual a', 'o que significa',
    'como é', 'qual seria', 'como seria'
  ];

  static classify(query: string): ClassificationResult {
    const q = query.toLowerCase().trim();
    
    const temporalMatches = this.countMatches(q, this.TEMPORAL_KEYWORDS);
    const globalMatches = this.countMatches(q, this.GLOBAL_KEYWORDS);
    const conceptualMatches = this.countMatches(q, this.CONCEPTUAL_KEYWORDS);

    const matchedKeywords = [
      ...this.getMatches(q, this.TEMPORAL_KEYWORDS),
      ...this.getMatches(q, this.GLOBAL_KEYWORDS),
      ...this.getMatches(q, this.CONCEPTUAL_KEYWORDS)
    ];

    let type = QuestionType.UNKNOWN;
    let confidence = 0;
    let suggestedDataSource: string | undefined;

    // Lógica de classificação com prioridade
    if (conceptualMatches > 0 && temporalMatches === 0 && globalMatches === 0) {
      type = QuestionType.CONCEPTUAL;
      confidence = Math.min(conceptualMatches / 3, 1.0);
    } else if (temporalMatches > 0 && globalMatches > 0) {
      type = QuestionType.FACTUAL_GLOBAL;
      confidence = Math.min((temporalMatches + globalMatches) / 4, 1.0);
      suggestedDataSource = 'Wikipedia + World Bank';
    } else if (temporalMatches > 0) {
      type = QuestionType.FACTUAL_TEMPORAL;
      confidence = Math.min(temporalMatches / 3, 1.0);
      suggestedDataSource = 'World Bank + Wikipedia';
    } else if (globalMatches > 0) {
      type = QuestionType.FACTUAL_GLOBAL;
      confidence = Math.min(globalMatches / 3, 1.0);
      suggestedDataSource = 'Wikipedia';
    }

    return {
      type,
      confidence: Math.max(confidence, 0.3),
      keywords: matchedKeywords,
      suggestedDataSource
    };
  }

  private static countMatches(query: string, keywords: string[]): number {
    return keywords.filter(kw => query.includes(kw)).length;
  }

  private static getMatches(query: string, keywords: string[]): string[] {
    return keywords.filter(kw => query.includes(kw));
  }

  static shouldSearchData(type: QuestionType, confidence: number): boolean {
    return (type === QuestionType.FACTUAL_TEMPORAL || 
            type === QuestionType.FACTUAL_GLOBAL) && 
           confidence > 0.4;
  }
}
