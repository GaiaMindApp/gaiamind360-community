/**
 * Hook para gerenciar dados globais das APIs
 * © 2025 GaiaMind
 */
import { useState, useEffect } from 'react';
import { GlobalAPIsService, WorldBankData } from '../services/globalAPIsService';

export function useGlobalData(countryCode: string | null) {
  const [data, setData] = useState<WorldBankData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await GlobalAPIsService.getWorldBankData(countryCode);
        setData(result);
      } catch (err) {
        setError('Erro ao carregar dados');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [countryCode]);

  return { data, loading, error };
}

export function useSDGData(goalNumber: number | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goalNumber) return;

    const fetchData = async () => {
      setLoading(true);
      const result = await GlobalAPIsService.getUNEPSDGData(goalNumber);
      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [goalNumber]);

  return { data, loading };
}
