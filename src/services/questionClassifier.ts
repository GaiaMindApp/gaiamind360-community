/**
 * Question Classifier - Detecta tipo de pergunta
 */

export enum QuestionType {
  CONCEPTUAL = 'CONCEPTUAL',
  FACTUAL_TEMPORAL = 'FACTUAL_TEMPORAL',
  FACTUAL_GLOBAL = 'FACTUAL_GLOBAL',
  UNKNOWN = 'UNKNOWN'
}

export class QuestionClassifier {
  static classify(query: string): QuestionType {
    const q = query.toLowerCase();

    // Palavras-chave temporais (últimos X anos, evolução, mudança)
    const temporalKeywords = [
      'últimos', 'anos', '2024', '2023', '2022', '2021', '2020', '2019',
      'evoluiu', 'evolução', 'mudou', 'aumentou', 'diminuiu', 'cresceu',
      'tendência', 'trend', 'histórico', 'ao longo', 'período'
    ];

    // Palavras-chave globais (mundo, planeta, global)
    const globalKeywords = [
      'mundo', 'planeta', 'global', 'internacional', 'países', 'nações',
      'terra', 'universo', 'humanidade', 'população mundial'
    ];

    // Palavras-chave conceituais (o que é, como funciona, por que)
    const conceptualKeywords = [
      'o que é', 'como funciona', 'explica', 'defina', 'diferença',
      'por que', 'significado', 'teoria', 'conceito', 'princípio',
      'qual é', 'quais são', 'descreva'
    ];

    const temporalMatches = temporalKeywords.filter(kw => q.includes(kw)).length;
    const globalMatches = globalKeywords.filter(kw => q.includes(kw)).length;
    const conceptualMatches = conceptualKeywords.filter(kw => q.includes(kw)).length;

    // Lógica de classificação
    if (conceptualMatches > 0 && temporalMatches === 0) {
      return QuestionType.CONCEPTUAL;
    }

    if (temporalMatches > 0 && globalMatches > 0) {
      return QuestionType.FACTUAL_GLOBAL;
    }

    if (temporalMatches > 0) {
      return QuestionType.FACTUAL_TEMPORAL;
    }

    if (globalMatches > 0) {
      return QuestionType.FACTUAL_GLOBAL;
    }

    return QuestionType.UNKNOWN;
  }

  static getConfidence(query: string, type: QuestionType): number {
    const q = query.toLowerCase();
    let score = 0;

    if (type === QuestionType.CONCEPTUAL) {
      const keywords = ['o que é', 'como funciona', 'explica', 'defina'];
      score = keywords.filter(kw => q.includes(kw)).length / keywords.length;
    } else if (type === QuestionType.FACTUAL_TEMPORAL) {
      const keywords = ['últimos', 'anos', 'evoluiu', 'mudou', 'aumentou'];
      score = keywords.filter(kw => q.includes(kw)).length / keywords.length;
    } else if (type === QuestionType.FACTUAL_GLOBAL) {
      const keywords = ['mundo', 'planeta', 'global', 'países'];
      score = keywords.filter(kw => q.includes(kw)).length / keywords.length;
    }

    return Math.min(score, 1.0);
  }
}
