/**
 * Conversation Memory Manager
 * Mantém contexto de conversa e permite continuidade de diálogo
 */

export interface ConversationContext {
  conversationId: string;
  country: string;
  lastTopic: string;
  lastQuestion: string;
  lastResponse: string;
  currentIntent: string;
  dataContext: any;
  timestamp: number;
}

export class ConversationMemory {
  private static memory: Map<string, ConversationContext> = new Map();
  private static readonly CONTINUATION_KEYWORDS = ['sim', 'explora', 'continua', 'fala mais', 'mais', 'e então', 'próximo', 'avança'];

  /**
   * Inicializa contexto de conversa
   */
  static initializeConversation(userId: string, country: string): ConversationContext {
    const conversationId = `${userId}-${Date.now()}`;
    const context: ConversationContext = {
      conversationId,
      country,
      lastTopic: '',
      lastQuestion: '',
      lastResponse: '',
      currentIntent: '',
      dataContext: {},
      timestamp: Date.now()
    };
    this.memory.set(userId, context);
    return context;
  }

  /**
   * Detecta se mensagem é continuação
   */
  static isContinuation(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return this.CONTINUATION_KEYWORDS.some(keyword => normalized.includes(keyword));
  }

  /**
   * Obtém contexto atual
   */
  static getContext(userId: string): ConversationContext | null {
    return this.memory.get(userId) || null;
  }

  /**
   * Atualiza contexto após resposta
   */
  static updateContext(
    userId: string,
    topic: string,
    question: string,
    response: string,
    intent: string,
    dataContext: any
  ): void {
    const context = this.memory.get(userId);
    if (context) {
      context.lastTopic = topic;
      context.lastQuestion = question;
      context.lastResponse = response;
      context.currentIntent = intent;
      context.dataContext = dataContext;
      context.timestamp = Date.now();
    }
  }

  /**
   * Constrói prompt contextual para continuação
   */
  static buildContinuationPrompt(context: ConversationContext, userMessage: string): string {
    return `Você está em uma conversa contínua sobre ${context.lastTopic} em ${context.country}.

CONTEXTO ANTERIOR:
- Pergunta anterior: "${context.lastQuestion}"
- Resposta anterior: "${context.lastResponse.substring(0, 300)}..."
- Intenção: ${context.currentIntent}
- Dados disponíveis: ${JSON.stringify(context.dataContext, null, 2)}

MENSAGEM DO USUÁRIO: "${userMessage}"

INSTRUÇÕES:
1. Entenda que "${userMessage}" é uma continuação da conversa anterior
2. Aprofunde o tema ${context.lastTopic} sem repetir informações já dadas
3. Use os dados já apresentados como base
4. Mantenha coerência com a resposta anterior
5. Seja conciso mas informativo
6. Termine com uma pergunta para manter o diálogo`;
  }

  /**
   * Resolve intenção de continuação
   */
  static resolveContinuationIntent(message: string, context: ConversationContext): string {
    const normalized = message.toLowerCase().trim();

    if (normalized.includes('sim') || normalized.includes('yes')) {
      return `Aprofunde o tema: ${context.lastTopic}`;
    }
    if (normalized.includes('explora')) {
      return `Explore cenários futuros para: ${context.lastTopic}`;
    }
    if (normalized.includes('continua') || normalized.includes('fala mais')) {
      return `Continue explicando: ${context.lastTopic}`;
    }
    if (normalized.includes('próximo') || normalized.includes('avança')) {
      return `Avance para o próximo aspecto de: ${context.lastTopic}`;
    }
    if (normalized.includes('e então')) {
      return `Explique as consequências de: ${context.lastTopic}`;
    }

    return `Continue explorando: ${context.lastTopic}`;
  }

  /**
   * Limpa memória de conversa
   */
  static clearConversation(userId: string): void {
    this.memory.delete(userId);
  }

  /**
   * Obtém resumo da conversa
   */
  static getConversationSummary(userId: string): string {
    const context = this.memory.get(userId);
    if (!context) return '';

    return `Conversa sobre ${context.lastTopic} em ${context.country}. Última pergunta: "${context.lastQuestion}". Intenção atual: ${context.currentIntent}`;
  }
}
