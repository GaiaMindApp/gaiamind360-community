import { API_BASE } from './apiBaseConfig';
import { authFetch } from './authFetch';

const API_URL = API_BASE.replace('/api', '');



export interface ResearchMetadata {
  research_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  upload_date: string;
  file_size: number;
}

export interface DetailedInsight {
  insight: string;
  interpretation: string;
}

export interface ResearchAnalysis {
  rows: number;
  columns: number;
  column_names: string[];
  statistics: Record<string, any>;
  insights: string[];
  detailed_insights: DetailedInsight[];
  timestamp: string;
}

export interface ResearchPublication {
  research_id: string;
  title: string;
  description: string;
  analysis: ResearchAnalysis;
  published_date?: string;
  upload_date?: string;
  status: string;
  type?: 'published' | 'draft';
}

class ResearchService {
  async uploadDataset(file: File): Promise<{ research_id: string; metadata: ResearchMetadata; preview: any[] }> {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File too large (${sizeMB}MB). Maximum allowed: 5MB`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await authFetch(`${API_URL}/api/research/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async analyzeDataset(researchId: string): Promise<{ analysis: ResearchAnalysis }> {
    const response = await authFetch(`${API_URL}/api/research/analyze/${researchId}`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Analysis failed');

    return response.json();
  }

  async generateAIReport(researchId: string): Promise<{ ai_interpretation: any[]; analysis: ResearchAnalysis }> {
    const response = await authFetch(`${API_URL}/api/research/generate-report/${researchId}`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to generate AI report');

    return response.json();
  }

  async publishResearch(researchId: string, title: string, description: string): Promise<ResearchPublication> {
    const response = await authFetch(`${API_URL}/api/research/publish/${researchId}?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Publish failed');

    const data = await response.json();
    return data.publication;
  }

  async listPublications(): Promise<ResearchPublication[]> {
    const response = await authFetch(`${API_URL}/api/research/list`);

    if (!response.ok) throw new Error('Failed to list publications');

    const data = await response.json();
    return data.publications;
  }

  async getHistory(): Promise<ResearchPublication[]> {
    const response = await authFetch(`${API_URL}/api/research/history`);
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required — please log in.');
      const ct = response.headers.get('content-type') || '';
      const detail = ct.includes('json') ? (await response.json()).detail : await response.text();
      throw new Error(detail || 'Failed to load history');
    }
    const data = await response.json();
    return data.history;
  }

  async deleteResearch(researchId: string): Promise<void> {
    const response = await authFetch(`${API_URL}/api/research/delete/${researchId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete research');
  }

  async deleteAllResearch(): Promise<void> {
    const response = await authFetch(`${API_URL}/api/research/delete-all`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete all research');
  }

  async searchResearch(query: string): Promise<ResearchPublication[]> {
    const response = await authFetch(`${API_URL}/api/research/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.results;
  }

  async exportResearch(researchId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await authFetch(`${API_URL}/api/research/export/${researchId}?format=${format}`);
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }

  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  getFileSizeWarning(size: number): string | null {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (size > MAX_SIZE * 0.8) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      return `Arquivo grande (${sizeMB}MB). Limite: 5MB`;
    }
    return null;
  }
}

export default new ResearchService();
