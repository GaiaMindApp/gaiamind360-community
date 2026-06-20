/**
 * GaiaMind Global APIs Service
 * © 2025 - Integração com World Bank, UNEP SDG e Copernicus
 */

import { APIService } from './apiService';
import { API_ENDPOINTS } from './apiConfigComplete';

export interface WorldBankData {
  country_code: string;
  data: {
    gdp_per_capita?: { value: number; year: string };
    population?: { value: number; year: string };
    renewable_energy?: { value: number; year: string };
    co2_emissions?: { value: number; year: string };
    forest_area?: { value: number; year: string };
  };
}

export class GlobalAPIsService {
  static async testAPIsConnectivity() {
    try {
      const response = await APIService.fetchWithTimeout(API_ENDPOINTS.GLOBAL_DATA.TEST_CONNECTIVITY);
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (error) {
      console.error('Backend connection error:', error);
    }
    return [{
      name: 'Backend Connection',
      success: false,
      duration: 0,
      error: 'Backend não está respondendo'
    }];
  }

  static async getWorldBankData(countryCode: string): Promise<WorldBankData | null> {
    try {
      const data = await APIService.getWorldBankData(countryCode);
      return data;
    } catch (error) {
      console.error('World Bank Error:', error);
      return null;
    }
  }

  static async getWorldBankIndicator(countryCode: string, indicator: string) {
    try {
      const response = await APIService.fetchWithTimeout(API_ENDPOINTS.GLOBAL_DATA.WORLDBANK_INDICATOR(countryCode, indicator));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('World Bank Error:', error);
    }
    return null;
  }

  static async getUNEPSDGData(goalNumber: number) {
    try {
      const response = await APIService.fetchWithTimeout(API_ENDPOINTS.GLOBAL_DATA.UNEP_SDG(goalNumber));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('UNEP Error:', error);
    }
    return null;
  }

  static async getCountryCompleteData(countryCode: string) {
    try {
      const data = await APIService.getCountryData(countryCode);
      return data;
    } catch (error) {
      console.error('Error getting country data:', error);
      return null;
    }
  }

  static async getAllCountriesData() {
    try {
      const response = await APIService.fetchWithTimeout(API_ENDPOINTS.GLOBAL_DATA.ALL_COUNTRIES);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error getting all countries:', error);
    }
    return null;
  }
}
