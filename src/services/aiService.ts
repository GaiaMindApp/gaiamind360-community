import { Message } from '../types/chat';
import { API_ENDPOINTS } from './apiConfigComplete';

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  MOCK: 'mock'
} as const;

export type AIProviderType = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

class AIService {
  private currentProvider: AIProviderType = AI_PROVIDERS.MOCK;
  private apiKeys: Record<string, string> = {};
  private conversationHistory: Message[] = [];

  setProvider(provider: AIProviderType) {
    this.currentProvider = provider;
  }

  setApiKey(provider: AIProviderType, apiKey: string) {
    this.apiKeys[provider] = apiKey;
  }

  setConversationHistory(messages: Message[]) {
    this.conversationHistory = messages;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    try {
      // Tentar usar o backend chat-stream primeiro
      const response = await authFetch(API_ENDPOINTS.CHAT.MESSAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (value) {
            fullContent += decoder.decode(value);
          }
          done = readerDone;
        }

        if (fullContent) return fullContent;
      }
    } catch (error) {
      console.log('Backend streaming indisponivel:', error);
    }

    // Fallback para OpenAI se configurado
    if (this.currentProvider === AI_PROVIDERS.OPENAI && this.apiKeys[AI_PROVIDERS.OPENAI]) {
      try {
        return await this.sendToOpenAI(message);
      } catch (error) {
        console.error('Erro OpenAI:', error);
      }
    }

    // Fallback para Gemini se configurado
    if (this.currentProvider === AI_PROVIDERS.GEMINI && this.apiKeys[AI_PROVIDERS.GEMINI]) {
      try {
        return await this.sendToGemini(message);
      } catch (error) {
        console.error('Erro Gemini:', error);
      }
    }

    // Ultimo fallback: resposta simples
    return this.getSimpleResponse(message);
  }

  private getSimpleResponse(message: string): string {
    const lower = message.toLowerCase();
    
    // Responder perguntas sobre data/hora
    if (lower.includes('que dia') || lower.includes('que horas') || lower.includes('hoje')) {
      const now = new Date();
      const days = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
      const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      const day = days[now.getDay()];
      const date = now.getDate();
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const time = now.toLocaleTimeString('pt-PT');
      
      return `Hoje e ${day}, ${date} de ${month} de ${year}. Sao ${time}.`;
    }

    return 'Por favor, configure uma API key (OpenAI ou Gemini) para respostas mais precisas. Ou use o backend com Ollama.';
  }

  private async sendToOpenAI(message: string): Promise<string> {
    const apiKey = this.apiKeys[AI_PROVIDERS.OPENAI];
    if (!apiKey) throw new Error('API Key do OpenAI nao configurada');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Voce e Gaia Mind, uma IA consciente e empatica.' },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Erro ao gerar resposta';
  }

  private async sendToGemini(message: string): Promise<string> {
    const apiKey = this.apiKeys[AI_PROVIDERS.GEMINI];
    if (!apiKey) throw new Error('API Key do Gemini nao configurada');

    const response = await authFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Voce e Gaia Mind. Responda: ${message}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'Erro ao gerar resposta';
  }
}

export const aiService = new AIService();
