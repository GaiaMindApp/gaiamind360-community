import { authFetch } from '../services/authFetch';
import { useState, useCallback } from 'react';

interface DateTimeInfo {
  date: string;
  time: string;
  day_of_week: string;
  month: string;
  year: number;
  timestamp: string;
}

interface CalculationResult {
  expression: string;
  result: number;
  success: boolean;
  error?: string;
}

interface Tool {
  name: string;
  description: string;
  parameters: any;
}

export function useGaiaMindTools() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDateTime = useCallback(async (): Promise<DateTimeInfo | null> => {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/tools/date-time');
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Erro ao obter data/hora');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculate = useCallback(async (expression: string): Promise<CalculationResult | null> => {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/tools/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Erro ao calcular');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchWeb = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/tools/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Erro ao buscar');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAvailableTools = useCallback(async (): Promise<Tool[] | null> => {
    try {
      const response = await authFetch('/api/tools/available-tools');
      const data = await response.json();
      return data.tools;
    } catch (err) {
      setError('Erro ao obter ferramentas');
      return null;
    }
  }, []);

  const executeTool = useCallback(async (toolName: string, toolInput: any) => {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: toolName, tool_input: toolInput })
      });
      const data = await response.json();
      return data.result;
    } catch (err) {
      setError('Erro ao executar ferramenta');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getDateTime,
    calculate,
    searchWeb,
    getAvailableTools,
    executeTool
  };
}
