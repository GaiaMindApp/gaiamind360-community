/**
 * Web Search Service - Busca dados em fontes confiáveis
 */

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WORLDBANK_API = 'https://api.worldbank.org/v2';

export interface SearchResult {
  source: string;
  title: string;
  content: string;
  url?: string;
}

export class WebSearchService {
  static async searchWikipedia(query: string): Promise<SearchResult | null> {
    try {
      const searchUrl = `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
      const searchResp = await fetch(searchUrl);
      if (!searchResp.ok) return null;
      const searchData = await searchResp.json();
      const title = searchData.query?.search?.[0]?.title;
      if (!title) return null;

      // Validar que o título não contém sequências que possam manipular a URL (CWE-918)
      const safeTitle = String(title).replace(/[\r\n\t]/g, '').slice(0, 200);
      const url = `${WIKIPEDIA_API}?action=query&prop=extracts&format=json&exintro=true&explaintext=true&titles=${encodeURIComponent(safeTitle)}&origin=*`;
      // Garantir que o fetch permanece no domínio Wikipedia
      if (!url.startsWith(WIKIPEDIA_API)) return null;

      const response = await fetch(
        `${WIKIPEDIA_API}?action=query&prop=extracts&format=json&exintro=true&explaintext=true&titles=${encodeURIComponent(safeTitle)}&origin=*`
      );
      if (!response.ok) return null;

      const data = await response.json();
      const pages = data.query?.pages || {};
      const page = Object.values(pages)[0] as any;

      if (!page?.extract) return null;

      return {
        source: 'Wikipedia',
        title: page.title || query,
        content: page.extract.substring(0, 1500),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
      };
    } catch (error) {
      console.error('Erro ao buscar Wikipedia:', error);
      return null;
    }
  }

  static async searchWorldBank(country: string, indicator: string): Promise<SearchResult | null> {
    try {
      const countryCode = this.getCountryCode(country);
      if (!countryCode) return null;

      const url = `${WORLDBANK_API}/country/${countryCode}/indicator/${indicator}?format=json&per_page=10&date=2015:2024`;
      
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data[1] || data[1].length === 0) return null;

      const values = data[1]
        .filter((item: any) => item.value !== null)
        .map((item: any) => `${item.date}: ${parseFloat(item.value).toFixed(2)}`)
        .join('\n');

      return {
        source: 'World Bank',
        title: `${indicator} - ${country}`,
        content: values,
        url: `https://data.worldbank.org/indicator/${indicator}`
      };
    } catch (error) {
      console.error('Erro ao buscar World Bank:', error);
      return null;
    }
  }

  static async searchCO2Data(country?: string): Promise<SearchResult | null> {
    if (country) {
      return this.searchWorldBank(country, 'EN.ATM.CO2E.PC');
    }
    return this.searchWikipedia('Emissões de CO2 no mundo');
  }

  static async searchEnergyData(country?: string): Promise<SearchResult | null> {
    if (country) {
      return this.searchWorldBank(country, 'EG.ELC.RNEW.ZS');
    }
    return this.searchWikipedia('Energia renovável');
  }

  static async searchForestData(country?: string): Promise<SearchResult | null> {
    if (country) {
      return this.searchWorldBank(country, 'AG.LND.FRST.ZS');
    }
    return this.searchWikipedia('Desflorestação');
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
