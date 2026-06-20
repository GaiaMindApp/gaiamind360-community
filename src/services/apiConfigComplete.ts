import { authFetch } from './authFetch';
/**
 * API Configuration - DEFINITIVO
 * ÚNICO arquivo de endpoints do projeto
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // ============================================
  // CHAT - Endpoints Principais
  // ============================================
  CHAT: {
    MESSAGE: `${API_BASE_URL}/api/chat/message`,
    CONVERSATIONS: `${API_BASE_URL}/api/chat/conversations`,
    CONVERSATIONS_BY_USER: (userId: string) => `${API_BASE_URL}/api/chat/conversations/${userId}`,
    CONVERSATION: (id: string) => `${API_BASE_URL}/api/chat/conversation/${id}`,
    MESSAGES: (id: string) => `${API_BASE_URL}/api/chat/conversations/${id}/messages`,
    STATUS: `${API_BASE_URL}/api/chat/status`,
    SEND: `${API_BASE_URL}/api/chat/send`,
    REGENERATE: (id: string) => `${API_BASE_URL}/api/chat/regenerate/${id}`,
    REACTION: `${API_BASE_URL}/api/chat/reaction`,
  },

  // ============================================
  // ADMIN
  // ============================================
  ADMIN: {
    SYSTEM_CONFIG: `${API_BASE_URL}/api/admin/system-config`,
    HEALTH: `${API_BASE_URL}/api/admin/health`,
    STATUS: `${API_BASE_URL}/api/admin/status`,
  },

  // ============================================
  // RESEARCH
  // ============================================
  RESEARCH: {
    UPLOAD: `${API_BASE_URL}/api/research/upload`,
    ANALYZE: (id: string) => `${API_BASE_URL}/api/research/analyze/${id}`,
    REPORT: (id: string) => `${API_BASE_URL}/api/research/generate-report/${id}`,
    PUBLISH: (id: string) => `${API_BASE_URL}/api/research/publish/${id}`,
    LIST: `${API_BASE_URL}/api/research/list`,
    HISTORY: `${API_BASE_URL}/api/research/history`,
    DELETE: (id: string) => `${API_BASE_URL}/api/research/delete/${id}`,
    DELETE_ALL: `${API_BASE_URL}/api/research/delete-all`,
    SEARCH: `${API_BASE_URL}/api/research/search`,
    EXPORT: (id: string, format: string) => `${API_BASE_URL}/api/research/export/${id}?format=${format}`,
  },

  // ============================================
  // GLOBAL DATA
  // ============================================
  GLOBAL_DATA: {
    WORLDBANK: (country: string) => `${API_BASE_URL}/api/global-data/worldbank/${country}`,
    WORLDBANK_INDICATOR: (country: string, indicator: string) => 
      `${API_BASE_URL}/api/global-data/worldbank/${country}/${indicator}`,
    CO2: `${API_BASE_URL}/api/global-data/co2`,
    COUNTRY: (country: string) => `${API_BASE_URL}/api/global-data/country/${country}`,
    TEST_CONNECTIVITY: `${API_BASE_URL}/api/global-data/test-connectivity`,
    COPERNICUS: `${API_BASE_URL}/api/global-data/copernicus/earth`,
    UNEP_SDG: (goal: number) => `${API_BASE_URL}/api/global-data/unep/sdg/${goal}`,
    ALL_COUNTRIES: `${API_BASE_URL}/api/global-data/countries/all`,
  },

  // ============================================
  // AGENT (Deprecated - usar CHAT)
  // ============================================
  AGENT: {
    QUERY: `${API_BASE_URL}/api/chat/message`, // Redirecionado para chat
    CO2_TREND: (country: string) => `${API_BASE_URL}/api/agent/co2/trend/${country}`,
    TOP_EMITTERS: `${API_BASE_URL}/api/agent/co2/top-emitters`,
    COMPARE: `${API_BASE_URL}/api/agent/co2/compare`,
    STATS: (userId: string) => `${API_BASE_URL}/api/agent/stats/${userId}`,
    STATUS: `${API_BASE_URL}/api/agent/status`,
  },

  // ============================================
  // POLICY SIMULATION
  // ============================================
  POLICY: {
    SIMULATE: `${API_BASE_URL}/api/policy/simulate`,
  },

  // ============================================
  // MULTI API SERVICE
  // ============================================
  MULTI_API: {
    TEST_ALL: `${API_BASE_URL}/api/multi-api/test-all-apis`,
    COUNTRY_RESILIENT: (code: string) => `${API_BASE_URL}/api/multi-api/country/${code}/resilient`,
    GLOBAL_SUMMARY: `${API_BASE_URL}/api/multi-api/global-summary`,
    BATCH: `${API_BASE_URL}/api/multi-api/countries/batch`,
    COMPARE: (c1: string, c2: string) => `${API_BASE_URL}/api/multi-api/compare/${c1}/${c2}`,
    HEALTH: `${API_BASE_URL}/api/multi-api/health-check`,
    SOURCES: `${API_BASE_URL}/api/multi-api/sources/status`,
  },

  // ============================================
  // GAIA INTELLIGENCE (offline analytics layer)
  // ============================================
  INTELLIGENCE: {
    RANKING: (limit = 50) => `${API_BASE_URL}/api/offline/ranking?limit=${limit}`,
    COUNTRY: (c: string) => `${API_BASE_URL}/api/offline/country/${c}`,
    ANOMALIES: (c: string) => `${API_BASE_URL}/api/offline/anomalies/${c}`,
    SIMULATE: `${API_BASE_URL}/api/offline/simulate`,
    SEMANTIC: (q: string) => `${API_BASE_URL}/api/offline/semantic-search?q=${encodeURIComponent(q)}`,
    STATUS: `${API_BASE_URL}/api/offline/status`,
  },

  // ============================================
  // UTILITY
  // ============================================
  HEALTH: `${API_BASE_URL}/health`,
  ROUTES: `${API_BASE_URL}/api/routes`,
};

// ============================================
// FUNÇÕES DE SERVIÇO
// ============================================

export const ChatService = {
  async sendMessage(conversationId: string, message: string) {
    const res = await authFetch(API_ENDPOINTS.CHAT.MESSAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, message })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async createConversation(userId: string = 'default') {
    const res = await authFetch(`${API_ENDPOINTS.CHAT.CONVERSATIONS}?user_id=${userId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getConversations(userId: string = 'default', limit: number = 50) {
    const res = await authFetch(`${API_ENDPOINTS.CHAT.CONVERSATIONS}?user_id=${userId}&limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getMessages(conversationId: string, limit: number = 20) {
    const res = await authFetch(`${API_ENDPOINTS.CHAT.MESSAGES(conversationId)}?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getStatus() {
    const res = await authFetch(API_ENDPOINTS.CHAT.STATUS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

export const AdminService = {
  async getSystemConfig() {
    const res = await authFetch(API_ENDPOINTS.ADMIN.SYSTEM_CONFIG);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

export const ResearchService = {
  async upload(formData: FormData) {
    const res = await authFetch(API_ENDPOINTS.RESEARCH.UPLOAD, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async list() {
    const res = await authFetch(API_ENDPOINTS.RESEARCH.LIST);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

export const GlobalDataService = {
  async getWorldBankData(country: string) {
    const res = await authFetch(API_ENDPOINTS.GLOBAL_DATA.WORLDBANK(country));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getCountryData(country: string) {
    const res = await authFetch(API_ENDPOINTS.GLOBAL_DATA.COUNTRY(country));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  ENDPOINTS: API_ENDPOINTS,
  Chat: ChatService,
  Admin: AdminService,
  Research: ResearchService,
  GlobalData: GlobalDataService,
};
