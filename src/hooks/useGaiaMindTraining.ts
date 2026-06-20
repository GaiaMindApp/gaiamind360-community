"""
Hook React para integrar Gaia Mind Training no Chat
"""

import { useState, useCallback } from 'react';
import { authFetch } from '../services/authFetch';

interface ValidationResult {
  is_empathetic: boolean;
  is_data_driven: boolean;
  is_actionable: boolean;
  is_aligned: boolean;
  reward_score: number;
  quality_level: string;
}

interface EnhancedResponse {
  original_response: string;
  enhanced_response: string;
  quality_level: string;
  reward_score: number;
  validation: ValidationResult;
}

interface TrainingMetrics {
  sft_examples: number;
  rlhf_examples: number;
  manifesto_active: boolean;
  personality_guidelines_active: boolean;
  core_concepts_count: number;
  conversation_history_length: number;
  average_quality_score: number;
}

export function useGaiaMindTraining() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getSystemPrompt = useCallback(async () => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/system-prompt');
      const data = await response.json();
      return data.system_prompt;
    } catch (err) {
      setError('Erro ao obter system prompt');
      return null;
    }
  }, []);

  const preparePrompt = useCallback(async (userQuery: string) => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/prepare-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_query: userQuery })
      });
      const data = await response.json();
      return data.enhanced_prompt;
    } catch (err) {
      setError('Erro ao preparar prompt');
      return userQuery;
    }
  }, []);

  const enhanceResponse = useCallback(async (
    response: string,
    question: string
  ): Promise<EnhancedResponse | null> => {
    setIsEnhancing(true);
    try {
      const result = await authFetch('/api/gaia-mind/chat/enhance-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, question })
      });
      const data = await result.json();
      return data;
    } catch (err) {
      setError('Erro ao melhorar resposta');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  const processMessage = useCallback(async (
    userMessage: string,
    llmResponse: string
  ): Promise<EnhancedResponse | null> => {
    setIsEnhancing(true);
    try {
      const response = await authFetch('/api/gaia-mind/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          llm_response: llmResponse
        })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Erro ao processar mensagem');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  const getMetrics = useCallback(async () => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/metrics');
      const data = await response.json();
      setMetrics(data);
      return data;
    } catch (err) {
      setError('Erro ao obter metricas');
      return null;
    }
  }, []);

  const getStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/status');
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Erro ao obter status');
      return null;
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/clear-history', {
        method: 'POST'
      });
      const data = await response.json();
      return data.success;
    } catch (err) {
      setError('Erro ao limpar historico');
      return false;
    }
  }, []);

  const getHistory = useCallback(async () => {
    try {
      const response = await authFetch('/api/gaia-mind/chat/history');
      const data = await response.json();
      return data.history;
    } catch (err) {
      setError('Erro ao obter historico');
      return [];
    }
  }, []);

  return {
    isEnhancing,
    metrics,
    error,
    getSystemPrompt,
    preparePrompt,
    enhanceResponse,
    processMessage,
    getMetrics,
    getStatus,
    clearHistory,
    getHistory
  };
}
