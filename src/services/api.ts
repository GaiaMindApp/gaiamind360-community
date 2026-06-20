import { authFetch } from './authFetch';
/**
 * API Configuration - Sistema Definitivo de Endpoints
 * Centraliza TODOS os endpoints do projeto
 */

const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1') {
      return `https://${h}`; // HTTPS em produção (CWE-319)
    }
  }
  return 'http://localhost:8000';
})();

const _ALLOWED_ORIGIN = (() => { try { return new URL(API_BASE_URL).origin; } catch { return ''; } })();

export const API_ENDPOINTS = {
  // Chat - Endpoints Unificados
  CHAT: {
    MESSAGE: `${API_BASE_URL}/api/chat/message`,
    CONVERSATIONS: `${API_BASE_URL}/api/chat/conversations`,
    CONVERSATION_MESSAGES: (id: string) => `${API_BASE_URL}/api/chat/conversations/${id}/messages`,
    STATUS: `${API_BASE_URL}/api/chat/status`,
  },

  // Admin
  ADMIN: {
    SYSTEM_CONFIG: `${API_BASE_URL}/api/admin/system-config`,
    HEALTH: `${API_BASE_URL}/api/admin/health`,
    STATUS: `${API_BASE_URL}/api/admin/status`,
  },

  // Research
  RESEARCH: {
    UPLOAD: `${API_BASE_URL}/api/research/upload`,
  },

  // Global Data
  GLOBAL_DATA: {
    WORLDBANK: `${API_BASE_URL}/api/global-data/worldbank`,
    CO2: `${API_BASE_URL}/api/global-data/co2`,
    COUNTRY: (country: string) => `${API_BASE_URL}/api/global-data/country/${country}`,
  },

  // Utility
  ROUTES: `${API_BASE_URL}/api/routes`,
  HEALTH: `${API_BASE_URL}/health`,
};

// ============================================
// SERVIÇOS DE API - Funções Reutilizáveis
// ============================================

/**
 * Chat Services
 */
export const ChatAPI = {
  async sendMessage(conversationId: string, message: string, dashboardContext?: string) {
    const response = await authFetch(API_ENDPOINTS.CHAT.MESSAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        ...(dashboardContext ? { dashboard_context: dashboardContext } : {})
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async createConversation(userId: string = 'default') {
    const response = await authFetch(`${API_ENDPOINTS.CHAT.CONVERSATIONS}?user_id=${userId}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async getConversations(userId: string = 'default', limit: number = 50) {
    const response = await authFetch(`${API_ENDPOINTS.CHAT.CONVERSATIONS}?user_id=${userId}&limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async getMessages(conversationId: string, limit: number = 20) {
    const response = await authFetch(`${API_ENDPOINTS.CHAT.CONVERSATION_MESSAGES(conversationId)}?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async getStatus() {
    const response = await authFetch(API_ENDPOINTS.CHAT.STATUS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
};

/**
 * Admin Services
 */
export const AdminAPI = {
  async getSystemConfig() {
    const response = await authFetch(API_ENDPOINTS.ADMIN.SYSTEM_CONFIG);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async getHealth() {
    const response = await authFetch(API_ENDPOINTS.ADMIN.HEALTH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
};

/**
 * Validation Services
 */
export const ValidationAPI = {
  async listRoutes() {
    try {
      const response = await authFetch(API_ENDPOINTS.ROUTES);
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  },

  async validateEndpoint(endpoint: string): Promise<boolean> {
    try {
      // Validar origem antes do fetch (CWE-918)
      const parsed = new URL(endpoint, window.location.origin);
      const allowed = [_ALLOWED_ORIGIN, window.location.origin];
      if (!allowed.includes(parsed.origin)) return false;
      const response = await authFetch(endpoint, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await authFetch(API_ENDPOINTS.HEALTH);
      return response.ok;
    } catch {
      return false;
    }
  }
};

// ============================================
// VALIDAÇÃO AUTOMÁTICA DE ENDPOINTS
// ============================================

export async function validateAllEndpoints() {
  const results: Record<string, boolean> = {};
  
  const endpointsToTest = [
    { name: 'CHAT.MESSAGE', url: API_ENDPOINTS.CHAT.MESSAGE },
    { name: 'CHAT.CONVERSATIONS', url: API_ENDPOINTS.CHAT.CONVERSATIONS },
    { name: 'CHAT.STATUS', url: API_ENDPOINTS.CHAT.STATUS },
    { name: 'ADMIN.SYSTEM_CONFIG', url: API_ENDPOINTS.ADMIN.SYSTEM_CONFIG },
    { name: 'HEALTH', url: API_ENDPOINTS.HEALTH },
  ];

  for (const endpoint of endpointsToTest) {
    results[endpoint.name] = await ValidationAPI.validateEndpoint(endpoint.url);
  }

  return results;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  ENDPOINTS: API_ENDPOINTS,
  Chat: ChatAPI,
  Admin: AdminAPI,
  Validation: ValidationAPI,
  validateAll: validateAllEndpoints
};
