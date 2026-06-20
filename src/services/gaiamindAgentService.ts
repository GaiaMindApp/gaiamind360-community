import { API_BASE } from './apiBaseConfig';

const BASE_URL = `${API_BASE}/agent`;

export interface QueryResponse {
  datasets_needed?: string[];
  analysis_type?: string;
  visualizations?: string[];
  explanation?: string;
  result?: any;
  data?: any;
  forecast?: any;
  interpretation?: string;
}

export const sendQuery = async (
  query: string,
  country?: string,
  user_id?: string
): Promise<QueryResponse> => {
  const data: any = { query };
  if (country) data.country = country;
  if (user_id) data.user_id = user_id;

  try {
    const response = await authFetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error: any) {
    console.error("Erro ao enviar query:", error.message);
    return { explanation: "❌ Erro ao processar a query." };
  }
};

export const getCO2Trend = async (
  country: string,
  user_id?: string
): Promise<QueryResponse> => {
  try {
    const url = `${BASE_URL}/co2/trend/${country}${user_id ? `?user_id=${user_id}` : ""}`;
    const response = await authFetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao obter CO2 trend:", error.message);
    return { explanation: "❌ Erro ao obter dados de CO2." };
  }
};

export const getTopEmitters = async (topN: number = 10): Promise<any> => {
  try {
    const response = await authFetch(`${BASE_URL}/co2/top-emitters?top_n=${topN}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao obter top emitters:", error.message);
    return { explanation: "❌ Erro ao obter dados." };
  }
};

export const compareCO2 = async (countries: string[]): Promise<any> => {
  try {
    const response = await authFetch(
      `${BASE_URL}/co2/compare?countries=${countries.join(",")}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao comparar CO2:", error.message);
    return { explanation: "❌ Erro ao comparar países." };
  }
};

export const getChatHistory = async (conversationId: string): Promise<any> => {
  try {
    const saved = localStorage.getItem('gaiamind-auth');
    const token = saved ? JSON.parse(saved).token : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao obter histórico:", error.message);
    return { messages: [] };
  }
};

export const getUserStats = async (user_id: string): Promise<any> => {
  try {
    const response = await authFetch(`${BASE_URL}/stats/${user_id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao obter stats:", error.message);
    return { stats: {} };
  }
};

export const getAgentStatus = async (): Promise<any> => {
  try {
    const response = await authFetch(`${BASE_URL}/status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error: any) {
    console.error("Erro ao obter status:", error.message);
    return { status: "offline" };
  }
};
