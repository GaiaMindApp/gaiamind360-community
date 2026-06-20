/**
 * GaiaMind API Service with Error Handling
 * Handles failed requests gracefully with fallback data
 */

import { API_BASE_URL } from './apiBaseConfig';

export class APIService {
  private static BACKEND_URL = API_BASE_URL;
  private static TIMEOUT = 5000;

  static getAuthHeaders(): Record<string, string> {
    const saved = localStorage.getItem('gaiamind-auth');
    const token = saved ? JSON.parse(saved).token : null;
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) base['Authorization'] = `Bearer ${token}`;
    return base;
  }

  private static async tryRefresh(): Promise<boolean> {
    try {
      const saved = localStorage.getItem('gaiamind-auth');
      const auth = saved ? JSON.parse(saved) : null;
      if (!auth?.refresh_token) return false;
      const res = await fetch(`${this.BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refresh_token }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('gaiamind-auth', JSON.stringify({ ...auth, token: data.access_token, refresh_token: data.refresh_token }));
      return true;
    } catch { return false; }
  }

  static fetchWithTimeout(url: string, options: RequestInit = {}, _retry = true): Promise<Response> {
    // Validar origem antes do fetch (CWE-918)
    try {
      const parsed = new URL(url, window.location.origin);
      const allowed = [new URL(this.BACKEND_URL).origin, window.location.origin];
      if (!allowed.includes(parsed.origin)) {
        return Promise.reject(new Error(`[APIService] URL bloqueada: ${parsed.origin}`));
      }
    } catch { /* URL relativa — permitida */ }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
    return fetch(url, {
      ...options,
      headers: { ...this.getAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
      signal: controller.signal,
    }).then(async response => {
      clearTimeout(timeoutId);
      if (response.status === 401 && _retry) {
        const refreshed = await this.tryRefresh();
        if (refreshed) return this.fetchWithTimeout(url, options, false);
      }
      return response;
    }).catch(error => {
      clearTimeout(timeoutId);
      throw error;
    });
  }

  static async getSystemConfig(): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.BACKEND_URL}/api/admin/system-config`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('System config fetch failed, using defaults:', error);
    }
    return this.getDefaultSystemConfig();
  }

  static async getCountryData(countryCode: string): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.BACKEND_URL}/api/global-data/country/${countryCode}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Country data fetch failed for ${countryCode.replace(/[\r\n]/g, ' ')}, using mock data:`, error);
    }
    return this.getMockCountryData(countryCode);
  }

  static async getWorldBankData(countryCode: string): Promise<any> {
    if (!/^[A-Za-z]{2,3}$/.test(countryCode)) {
      console.warn(`[APIService] Invalid country code skipped: ${countryCode}`);
      return null;
    }
    try {
      const response = await this.fetchWithTimeout(`${this.BACKEND_URL}/api/global-data/worldbank/${countryCode}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`World Bank data fetch failed for ${countryCode.replace(/[\r\n]/g, ' ')}, using mock data:`, error);
    }
    return this.getMockWorldBankData(countryCode);
  }

  private static getDefaultSystemConfig(): any {
    return {
      status: 'ok',
      mode: 'production',
      ai_providers: ['gemini', 'groq', 'local'],
      backend_version: '2.0.0'
    };
  }

  private static getMockCountryData(countryCode: string): any {
    const mockData: { [key: string]: any } = {
      'AO': {
        country_code: 'AO',
        country_name: 'Angola',
        data: {
          gdp_per_capita: { value: 3432, year: '2023' },
          population: { value: 32866272, year: '2023' },
          renewable_energy: { value: 12.5, year: '2023' },
          co2_emissions: { value: 1.2, year: '2023' },
          forest_area: { value: 46.8, year: '2023' }
        }
      },
      'DE': {
        country_code: 'DE',
        country_name: 'Germany',
        data: {
          gdp_per_capita: { value: 48756, year: '2023' },
          population: { value: 83369843, year: '2023' },
          renewable_energy: { value: 46.2, year: '2023' },
          co2_emissions: { value: 7.8, year: '2023' },
          forest_area: { value: 32.8, year: '2023' }
        }
      },
      'BR': {
        country_code: 'BR',
        country_name: 'Brazil',
        data: {
          gdp_per_capita: { value: 8917, year: '2023' },
          population: { value: 215313498, year: '2023' },
          renewable_energy: { value: 65.1, year: '2023' },
          co2_emissions: { value: 2.3, year: '2023' },
          forest_area: { value: 60.1, year: '2023' }
        }
      }
    };

    return mockData[countryCode] || mockData['AO'];
  }

  private static getMockWorldBankData(countryCode: string): any {
    const mockData: { [key: string]: any } = {
      'AO': {
        country_code: 'AO',
        data: {
          gdp_per_capita: { value: 3432, year: '2023' },
          population: { value: 32866272, year: '2023' },
          renewable_energy: { value: 12.5, year: '2023' },
          co2_emissions: { value: 1.2, year: '2023' },
          forest_area: { value: 46.8, year: '2023' }
        }
      },
      'DE': {
        country_code: 'DE',
        data: {
          gdp_per_capita: { value: 48756, year: '2023' },
          population: { value: 83369843, year: '2023' },
          renewable_energy: { value: 46.2, year: '2023' },
          co2_emissions: { value: 7.8, year: '2023' },
          forest_area: { value: 32.8, year: '2023' }
        }
      }
    };

    return mockData[countryCode] || null;
  }
}
