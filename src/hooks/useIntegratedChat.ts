import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../services/apiConfigComplete';
import { authFetch } from '../services/authFetch';

interface ChatResponse {
  success: boolean;
  response_id: string;
  response: string;
  quality: {
    overall_score: number;
    quality_level: string;
    passed_evaluation: boolean;
    scores: {
      factuality: number;
      clarity: number;
      source_alignment: number;
      utility: number;
      overall: number;
    };
  };
  sources: Array<{
    source_id: string;
    name: string;
    score: number;
    usage_count: number;
  }>;
  context: Array<any>;
  issues: string[];
  suggestions: string[];
  metadata: {
    session_id: string;
    turn: number;
    model: string;
    provider: string;
    timestamp: string;
  };
}

interface SessionStats {
  session_id: string;
  turns: number;
  rag_stats: any;
  memory_stats: any;
  evaluation_stats: any;
  observability_stats: any;
}

interface Dashboard {
  session: any;
  rag: any;
  memory: any;
  evaluation: any;
  observability: any;
}

export const useIntegratedChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const processChat = useCallback(
    async (
      query: string,
      response: string,
      sources?: string[],
      model?: string,
      provider?: string,
      responseTimeMs?: number,
      tokensUsed?: number,
      costUsd?: number
    ): Promise<ChatResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(API_ENDPOINTS.HEALTH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            response,
            sources,
            model: model || 'gpt-3.5',
            provider: provider || 'openrouter',
            response_time_ms: responseTimeMs || 0,
            tokens_used: tokensUsed || 0,
            cost_usd: costUsd || 0,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ChatResponse = await res.json();
        setLastResponse(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const submitFeedback = useCallback(
    async (
      responseId: string,
      rating: number,
      sourceId?: string,
      comment?: string
    ): Promise<boolean> => {
      try {
        const res = await authFetch(`${apiUrl}/api/chat-integrated/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_id: responseId,
            rating,
            source_id: sourceId,
            comment: comment || '',
          }),
        });

        return res.ok;
      } catch (err) {
        console.error('Feedback error:', err);
        return false;
      }
    },
    [apiUrl]
  );

  const getSessionStats = useCallback(async (): Promise<SessionStats | null> => {
    try {
      const res = await authFetch(API_ENDPOINTS.HEALTH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setStats(data.stats);
      return data.stats;
    } catch (err) {
      console.error('Stats error:', err);
      return null;
    }
  }, [apiUrl]);

  const getDashboard = useCallback(async (): Promise<Dashboard | null> => {
    try {
      const res = await authFetch(API_ENDPOINTS.HEALTH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setDashboard(data.dashboard);
      return data.dashboard;
    } catch (err) {
      console.error('Dashboard error:', err);
      return null;
    }
  }, [apiUrl]);

  return {
    processChat,
    submitFeedback,
    getSessionStats,
    getDashboard,
    loading,
    error,
    lastResponse,
    stats,
    dashboard,
  };
};
