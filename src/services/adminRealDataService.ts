/**
 * Admin Real Data Service
 * © 2025 - Consume datos reales desde backend
 */

interface AIMetrics {
  model_name: string;
  provider: string;
  latency_ms: number;
  accuracy: number | null;
  cost_per_1k_tokens: number;
  requests_today: number;
  errors_today: number;
  uptime_percent: number;
  last_updated: string;
}

interface APIHealthStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string;
  response_time_ms: number | null;
  error_message: string | null;
}

interface SystemConfig {
  language: string;
  dark_mode: boolean;
  auto_sync_interval_minutes: number;
  auto_sync_enabled: boolean;
}

interface VersionInfo {
  version: string;
  date: string;
  git_tag: string | null;
  commit_hash: string | null;
  notes: string;
  deployed_at: string;
}

interface AdminStatus {
  ai_metrics: AIMetrics;
  api_health: APIHealthStatus[];
  system_config: SystemConfig;
  versions: VersionInfo[];
  timestamp: string;
}

import { API_BASE } from './apiBaseConfig';
import { authFetch } from './authFetch';

class AdminRealDataService {
  private static readonly API_BASE = API_BASE;
  private static readonly CACHE_TTL = 30000;
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static retryAttempts = 3;
  private static retryDelay = 1000;

  static async getAIMetrics(): Promise<AIMetrics> {
    return this.fetchWithCache<AIMetrics>('/admin/ai-metrics', 'ai-metrics');
  }

  static async getAPIHealth(): Promise<APIHealthStatus[]> {
    return this.fetchWithCache<APIHealthStatus[]>('/admin/api-health', 'api-health');
  }

  static async resyncAPI(apiName: string): Promise<{ status: string; api: string; timestamp: string }> {
    try {
      const response = await authFetch(
        `${this.API_BASE}/admin/api-resync/${encodeURIComponent(apiName)}`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.cache.delete('api-health');
      return response.json();
    } catch (error) {
      console.error(`Error resyncing API ${apiName.replace(/[\r\n]/g, ' ')}:`, error);
      throw error;
    }
  }

  static async getSystemConfig(): Promise<SystemConfig> {
    return this.fetchWithCache<SystemConfig>('/admin/system-config', 'system-config');
  }

  static async updateSystemConfig(config: SystemConfig): Promise<{ success: boolean; config: SystemConfig; timestamp: string }> {
    try {
      const response = await authFetch(
        `${this.API_BASE}/admin/system-config`,
        { method: 'POST', body: JSON.stringify(config) }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.cache.delete('system-config');
      return response.json();
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  }

  static async getVersions(): Promise<VersionInfo[]> {
    return this.fetchWithCache<VersionInfo[]>('/admin/versions', 'versions');
  }

  static async getAdminStatus(): Promise<AdminStatus> {
    return this.fetchWithCache<AdminStatus>('/admin/status', 'admin-status');
  }

  private static async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await authFetch(`${this.API_BASE}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401 || response.status === 403) throw Object.assign(new Error(`HTTP ${response.status}`), { noRetry: true });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      } catch (error: any) {
        lastError = error as Error;
        if (error.noRetry || attempt >= this.retryAttempts - 1) break;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }

    if (cached) {
      console.warn(`Using stale cache for ${cacheKey.replace(/[\r\n]/g, ' ')}`);
      return cached.data as T;
    }
    throw lastError || new Error(`Failed to fetch ${endpoint.replace(/[\r\n]/g, ' ')}`);
  }

  static clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  static startAutoPolling(interval: number = 30000, callback?: (status: AdminStatus) => void): () => void {
    const pollInterval = setInterval(async () => {
      try {
        const status = await this.getAdminStatus();
        callback?.(status);
      } catch (error) {
        console.error('Error in auto-polling:', error);
      }
    }, interval);
    return () => clearInterval(pollInterval);
  }
}

export default AdminRealDataService;
export type { AIMetrics, APIHealthStatus, SystemConfig, VersionInfo, AdminStatus };
