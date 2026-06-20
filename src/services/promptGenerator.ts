/**
 * Prompt Generator - Cria prompts estruturados para LLM com dados confiáveis
 */

import { SearchResult } from './advancedWebSearchService';
import { QuestionType } from './advancedQuestionClassifier';

export class PromptGenerator {
  static generateConceptualPrompt(query: string): string {
    return `Você é Gaia Mind, um assistente ambiental consciente, empático e especializado.

Pergunta do usuário: "${query}"

Responda de forma clara, educativa e inspiradora. Use markdown com:
- Explicações simples e acessíveis
- Exemplos práticos quando possível
- Impacto ambiental e social
- Sugestões de ações sustentáveis

Seja empático e motivador.`;
  }

  static generateFactualPrompt(
    query: string,
    data: SearchResult,
    type: QuestionType
  ): string {
    const dataContext = `
Dados confiáveis obtidos de ${data.source}:
---
${data.content}
---
Fonte: ${data.url || data.source}`;

    const instructions = type === QuestionType.FACTUAL_TEMPORAL
      ? 'Analise a evolução temporal dos dados, destaque tendências, mudanças significativas e projeções.'
      : 'Analise os dados globais, compare regiões/países, destaque disparidades e padrões.';

    return `Você é Gaia Mind, um assistente ambiental especializado em análise de dados.

Pergunta do usuário: "${query}"

${dataContext}

${instructions}

Gere uma resposta estruturada com:
- **Resumo executivo** (1-2 linhas)
- **Dados principais** (bullets com números)
- **Análise** (insights e tendências)
- **Implicações** (impacto ambiental/social)
- **Recomendações** (ações possíveis)

Use markdown, seja preciso e cite a fonte.`;
  }

  static generateFallbackPrompt(query: string, attemptedSources: string[]): string {
    return `Você é Gaia Mind, um assistente ambiental.

Pergunta do usuário: "${query}"

⚠️ Não foram encontrados dados oficiais em: ${attemptedSources.join(', ')}

Responda com:
1. O que você sabe sobre o tema (conhecimento geral)
2. ⚠️ Aviso claro: "Dados específicos não foram encontrados"
3. Fontes recomendadas para pesquisa:
   - Wikipedia (en.wikipedia.org)
   - World Bank (data.worldbank.org)
   - IPCC (ipcc.ch)
   - ONU (un.org)

Seja honesto sobre limitações de dados.`;
  }

  static generateMultiSourcePrompt(
    query: string,
    dataSources: SearchResult[]
  ): string {
    const dataContext = dataSources
      .map(d => `**${d.source}**:\n${d.content}\nFonte: ${d.url || d.source}`)
      .join('\n\n---\n\n');

    return `Você é Gaia Mind, especialista em análise ambiental com múltiplas fontes.

Pergunta do usuário: "${query}"

Dados de múltiplas fontes confiáveis:
---
${dataContext}
---

Gere uma análise integrada que:
- Sintetiza informações de todas as fontes
- Destaca concordâncias e divergências
- Prioriza dados mais recentes
- Cita cada fonte apropriadamente

Use markdown com estrutura clara.`;
  }
}
