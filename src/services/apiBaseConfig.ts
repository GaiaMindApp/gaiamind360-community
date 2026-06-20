/**
 * @deprecated Este arquivo está DEPRECADO
 * Use: src/services/apiConfigComplete.ts
 * 
 * Migração: Substituir imports de './apiBaseConfig' por './apiConfigComplete'
 */

export { API_ENDPOINTS } from './apiConfigComplete';
// Detecta automaticamente o host correcto (localhost vs IP de rede local para telemóvel)
const _autoHost = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1') {
      // Produção — usar sempre HTTPS (CWE-319)
      return `https://${h}`;
    }
  }
  return 'http://localhost:8000';
})();

export const API_BASE_URL = _autoHost;
export const API_BASE = `${API_BASE_URL}/api`;
