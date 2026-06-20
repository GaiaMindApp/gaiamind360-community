/**
 * Chat History Service - Frontend
 */

import { API_BASE } from './apiBaseConfig';
import { authFetch } from './authFetch';

const CHAT_API = `${API_BASE}/chat`;

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  model: string;
  language: string;
  is_archived: boolean;
  summary: string | null;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens: number | null;
  metadata: Record<string, any>;
  version: number;
  parent_message_id: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: 'like' | 'dislike';
  feedback_reason: string | null;
  created_at: string;
}

export class ChatHistoryService {
  private static getToken(): string | null {
    const saved = localStorage.getItem('gaiamind-auth');
    return saved ? JSON.parse(saved).token : null;
  }

  private static authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  }

  // Criar conversa no backend
  static async createConversation(title?: string): Promise<Conversation> {
    const token = this.getToken();
    if (!token) {
      // fallback local se não autenticado
      return {
        id: `temp_${Date.now()}`, user_id: 'guest', title: title || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        model: 'gemini-3.1b', language: 'pt', is_archived: false, summary: null, message_count: 0
      };
    }
    const response = await authFetch(`${CHAT_API}/conversations`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    if (!response.ok) throw new Error('Erro ao criar conversa');
    return response.json();
  }

  // Salvar conversa no backend (chamado após primeira mensagem)
  static async saveConversation(_conversation: Conversation): Promise<Conversation> {
    const title = _conversation.title || undefined;
    const url = title
      ? `${CHAT_API}/conversations?title=${encodeURIComponent(title)}`
      : `${CHAT_API}/conversations`;
    const response = await authFetch(url, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    return response.json();
  }

  static async listConversations(limit: number = 50): Promise<Conversation[]> {
    const response = await authFetch(`${CHAT_API}/conversations?limit=${limit}`, {
      headers: this.authHeaders(),
      cache: 'no-store', // Evita o reaparecimento das conversas devido à cache do browser
    });
    if (!response.ok) return [];
    return response.json();
  }

  static async getConversation(conversationId: string): Promise<Conversation> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}`, {
      headers: this.authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Conversa não encontrada');
    return response.json();
  }

  static async updateTitle(conversationId: string, title: string): Promise<Conversation> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/title?title=${encodeURIComponent(title)}`, {
      method: 'PUT',
      headers: this.authHeaders(),
    });
    return response.json();
  }

  static async archiveConversation(conversationId: string): Promise<Conversation> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/archive`, {
      method: 'PUT',
      headers: this.authHeaders(),
    });
    return response.json();
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    if (conversationId.startsWith('temp_')) return; // Ignora conversas locais temporárias
    
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok) throw new Error('Erro ao eliminar conversa do servidor');
  }

  static async searchConversations(query: string): Promise<Conversation[]> {
    const response = await authFetch(`${CHAT_API}/conversations/search?q=${encodeURIComponent(query)}`, {
      headers: this.authHeaders(),
    });
    return response.json();
  }

  // Mensagens
  static async addMessage(conversationId: string, role: 'user' | 'assistant', content: string, tokens?: number, metadata?: Record<string, any>): Promise<Message> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ role, content, tokens, metadata })
    });
    return response.json();
  }

  static async getMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
    if (conversationId.startsWith('temp_')) return [];
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/messages?limit=${limit}`, {
      headers: this.authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  static async getContext(conversationId: string, limit: number = 15): Promise<{ context: Array<{ role: string; content: string }> }> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/context?limit=${limit}`, {
      headers: this.authHeaders(),
      cache: 'no-store',
    });
    return response.json();
  }

  // Reações
  static async addReaction(messageId: string, reaction: 'like' | 'dislike', feedbackReason?: string): Promise<MessageReaction> {
    const response = await authFetch(`${CHAT_API}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ reaction, feedback_reason: feedbackReason })
    });
    if (!response.ok) throw new Error('Erro ao adicionar reação');
    return response.json();
  }

  static async getReaction(messageId: string): Promise<MessageReaction | null> {
    const response = await authFetch(`${CHAT_API}/messages/${messageId}/reactions`, {
      headers: this.authHeaders(),
    });
    const data = await response.json();
    return data.reaction || null;
  }

  // Regenerar
  static async regenerateMessage(conversationId: string, parentMessageId: string, newContent: string, tokens?: number): Promise<Message> {
    const response = await authFetch(`${CHAT_API}/conversations/${conversationId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_message_id: parentMessageId, new_content: newContent, tokens })
    });
    return response.json();
  }

  // Utilitários
  static copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }

  static generateTitle(firstMessage: string): string {
    // Resumir primeira mensagem em até 6 palavras
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (words.length < firstMessage.split(' ').length ? '...' : '');
  }
}
