/**
 * Advanced Web Search Service - Busca robusta com cache, retry e fallback
 */

export interface SearchResult {
  source: string;
  title: string;
  content: string;
  url?: string;
  timestamp: number;
}

export interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WORLDBANK_API = 'https://api.worldbank.org/v2';
const CACHE_TTL = 3600000; // 1 hora

export class AdvancedWebSearchService {
  private static cache: Map<string, CacheEntry> = new Map();

  private static getCacheKey(source: string, query: string): string {
    return `${source}:${query}`.toLowerCase();
  }

  private static isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL;
  }

  static async searchWikipedia(query: string, retries = 3): Promise<SearchResult | null> {
    const cacheKey = this.getCacheKey('wikipedia', query);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const searchUrl = `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
        const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
        if (!searchResp.ok) throw new Error(`HTTP ${searchResp.status}`);
        const searchData = await searchResp.json();
        const title = searchData.query?.search?.[0]?.title;
        if (!title) return null;

        // Sanitizar título vindo de fonte externa antes de usar na URL (CWE-918)
        const safeTitle = String(title).replace(/[\r\n\t]/g, '').slice(0, 200);
        const detailUrl = `${WIKIPEDIA_API}?action=query&prop=extracts&format=json&exintro=true&explaintext=true&titles=${encodeURIComponent(safeTitle)}&origin=*`;
        if (!detailUrl.startsWith(WIKIPEDIA_API)) return null;

        const response = await fetch(
          `${WIKIPEDIA_API}?action=query&prop=extracts&format=json&exintro=true&explaintext=true&titles=${encodeURIComponent(safeTitle)}&origin=*`,
          { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'GaiaMind/1.0' } }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const pages = data.query?.pages || {};
        const page = Object.values(pages)[0] as any;

        if (!page?.extract) return null;

        const result: SearchResult = {
          source: 'Wikipedia',
          title: page.title || query,
          content: page.extract.substring(0, 2000),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          timestamp: Date.now()
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  }

  static async searchWorldBank(country: string, indicator: string, retries = 3): Promise<SearchResult | null> {
    const cacheKey = this.getCacheKey('worldbank', `${country}:${indicator}`);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const countryCode = this.getCountryCode(country);
    if (!countryCode) return null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const url = `${WORLDBANK_API}/country/${countryCode}/indicator/${indicator}?format=json&per_page=10&date=2015:2024`;
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'GaiaMind/1.0' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data[1] || data[1].length === 0) return null;

        const values = data[1]
          .filter((item: any) => item.value !== null)
          .map((item: any) => `${item.date}: ${parseFloat(item.value).toFixed(2)}`)
          .join('\n');

        const result: SearchResult = {
          source: 'World Bank',
          title: `${indicator} - ${country}`,
          content: values,
          url: `https://data.worldbank.org/indicator/${indicator}`,
          timestamp: Date.now()
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  }

  static async searchCO2Data(country?: string): Promise<SearchResult | null> {
    if (country) {
      const wb = await this.searchWorldBank(country, 'EN.ATM.CO2E.PC');
      if (wb) return wb;
    }
    return this.searchWikipedia('Emissões de CO2');
  }

  static async searchEnergyData(country?: string): Promise<SearchResult | null> {
    if (country) {
      const wb = await this.searchWorldBank(country, 'EG.ELC.RNEW.ZS');
      if (wb) return wb;
    }
    return this.searchWikipedia('Energia renovável');
  }

  static async searchForestData(country?: string): Promise<SearchResult | null> {
    if (country) {
      const wb = await this.searchWorldBank(country, 'AG.LND.FRST.ZS');
      if (wb) return wb;
    }
    return this.searchWikipedia('Desflorestação');
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  private static getCountryCode(country: string): string | null {
    const codes: Record<string, string> = {
      'brasil': 'BRA', 'brazil': 'BRA',
      'espanha': 'ESP', 'spain': 'ESP',
      'portugal': 'PRT',
      'eua': 'USA', 'united states': 'USA',
      'china': 'CHN',
      'índia': 'IND', 'india': 'IND',
      'alemanha': 'DEU', 'germany': 'DEU',
      'frança': 'FRA', 'france': 'FRA',
      'reino unido': 'GBR', 'uk': 'GBR',
      'japão': 'JPN', 'japan': 'JPN',
      'méxico': 'MEX', 'mexico': 'MEX',
      'argentina': 'ARG',
      'austrália': 'AUS', 'australia': 'AUS'
    };
    return codes[country.toLowerCase().trim()] || null;
  }
}
