/**
 * AI Orchestrator
 * Orquestrador central com fallback automático em cascata
 * Tenta múltiplos modelos em ordem de prioridade até obter resposta válida
 */

export interface AIModel {
  name: string;
  timeout: number;
  handler: (prompt: string) => Promise<string>;
}

export interface OrchestrationResult {
  response: string;
  model: string;
  timeMs: number;
  success: boolean;
}

export class AIOrchestrator {
  private static models: AIModel[] = [];
  private static activeControllers: Map<string, AbortController> = new Map();

  /**
   * Registra modelos disponíveis em ordem de prioridade
   */
  static registerModels(models: AIModel[]): void {
    this.models = models;
    const safeNames = models.map(m => `${m.name.replace(/[\r\n]/g, ' ')}(${m.timeout}ms)`).join(' → ');
    console.log(`${models.length} modelos registrados: ${safeNames}`);
  }

  /**
   * Orquestra requisições com fallback automático
   */
  static async orchestrate(prompt: string, technicalSummary: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random()}`;

    console.log(`🎯 Iniciando orquestração (${this.models.length} modelos disponíveis)`);

    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      console.log(`Tentando ${model.name.replace(/[\r\n]/g, ' ')} (timeout: ${model.timeout}ms)...`);

      try {
        const controller = new AbortController();
        this.activeControllers.set(requestId, controller);

        const timeoutId = setTimeout(() => controller.abort(), model.timeout);

        const response = await Promise.race([
          model.handler(prompt),
          new Promise<string>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`${model.name} timeout`));
            });
          })
        ]);

        clearTimeout(timeoutId);
        this.activeControllers.delete(requestId);

        if (response && response.length > 30) {
          const timeMs = Date.now() - startTime;
          console.log(`${model.name.replace(/[\r\n]/g, ' ')} respondeu em ${timeMs}ms`);
          this.cancelPendingRequests(requestId);
          return {
            response,
            model: model.name,
            timeMs,
            success: true
          };
        }
      } catch (error) {
        console.warn(`${model.name.replace(/[\r\n]/g, ' ')} falhou:`, (error as Error).message.replace(/[\r\n]/g, ' '));
        continue;
      }
    }

    // Fallback técnico puro
    const timeMs = Date.now() - startTime;
    console.log(`⚠️ Todos os modelos falharam. Usando resposta técnica pura (${timeMs}ms)`);
    this.activeControllers.delete(requestId);

    return {
      response: technicalSummary,
      model: 'Technical (Fallback)',
      timeMs,
      success: false
    };
  }

  /**
   * Cancela requisições pendentes
   */
  private static cancelPendingRequests(requestId: string): void {
    const controller = this.activeControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(requestId);
    }
  }

  /**
   * Handler para Gemma 7B
   */
  static async handleGemma(prompt: string): Promise<string> {
    return this.callOllama('gemma:7b', prompt);
  }

  /**
   * Handler para Mistral 7B
   */
  static async handleMistral(prompt: string): Promise<string> {
    return this.callOllama('mistral', prompt);
  }

  /**
   * Handler para Qwen 2.5
   */
  static async handleQwen(prompt: string): Promise<string> {
    return this.callOllama('qwen:7b', prompt);
  }

  /**
   * Handler para Phi-3 Mini
   */
  static async handlePhi3(prompt: string): Promise<string> {
    return this.callOllama('phi3:mini', prompt);
  }

  /**
   * Handler para TinyLlama
   */
  static async handleTinyLlama(prompt: string): Promise<string> {
    return this.callOllama('tinyllama', prompt);
  }

  /**
   * Chamada genérica ao Ollama
   */
  private static async callOllama(model: string, prompt: string): Promise<string> {
    // URL configurável via env — localhost é aceite com HTTP (CWE-319 não se aplica a loopback)
    const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        num_predict: 500
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    if (!text || text.length < 30) {
      throw new Error('Resposta vazia ou muito curta');
    }

    return text;
  }

  /**
   * Constrói prompt padrão para todos os modelos
   */
  static buildStandardPrompt(technicalSummary: string): string {
    return `Você receberá uma análise técnica já validada.

DADOS TÉCNICOS:
${technicalSummary}

INSTRUÇÕES CRÍTICAS:
1. NÃO altere números ou valores
2. NÃO invente dados
3. Explique de forma clara, educativa e humana
4. Máximo 150 palavras
5. Responda em português

Agora, transforme esta análise técnica em uma explicação clara e acessível.`;
  }
}
