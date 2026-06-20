interface GeoDataCache {
  countries: any[];
  cities: any[];
  lastUpdated: number;
}

class GeoDataService {
  private cache: GeoDataCache | null = null;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  async fetchGeodata(): Promise<GeoDataCache> {
    // Verificar cache
    if (this.cache && Date.now() - this.cache.lastUpdated < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Tentar buscar dados reais das APIs
      const [countriesData, citiesData] = await Promise.all([
        this.fetchCountriesData(),
        this.fetchCitiesData()
      ]);

      this.cache = {
        countries: countriesData,
        cities: citiesData,
        lastUpdated: Date.now()
      };

      // Salvar no localStorage
      localStorage.setItem('gaiamind-geodata', JSON.stringify(this.cache));
      
      return this.cache;
    } catch (error) {
      console.warn('Failed to fetch real geodata, using fallback:', error);
      return this.getFallbackData();
    }
  }

  private async fetchCountriesData(): Promise<any[]> {
    // Simular chamada para Natural Earth Data
    // Em produção: fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson')
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { name: 'Brazil', code: 'BR', lat: -14.2350, lon: -51.9253, population: 215313498 },
          { name: 'United States', code: 'US', lat: 39.8283, lon: -98.5795, population: 331002651 },
          { name: 'China', code: 'CN', lat: 35.8617, lon: 104.1954, population: 1439323776 },
          { name: 'Germany', code: 'DE', lat: 51.1657, lon: 10.4515, population: 83783942 },
          { name: 'Japan', code: 'JP', lat: 36.2048, lon: 138.2529, population: 125836021 }
        ]);
      }, 1000);
    });
  }

  private async fetchCitiesData(): Promise<any[]> {
    // Simular chamada para GeoNames API
    // Em produção: fetch(`https://secure.geonames.org/searchJSON?country=${countryCode}&maxRows=100&username=${username}`)
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'BR', population: 12325232 },
          { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US', population: 8336817 },
          { name: 'Shanghai', lat: 31.2304, lon: 121.4737, country: 'CN', population: 27058479 },
          { name: 'Berlin', lat: 52.5200, lon: 13.4050, country: 'DE', population: 3669491 },
          { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP', population: 37400068 }
        ]);
      }, 800);
    });
  }

  private getFallbackData(): GeoDataCache {
    // Dados de fallback do cache local ou dados estáticos
    const saved = localStorage.getItem('gaiamind-geodata');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn('Failed to parse cached geodata');
      }
    }

    // Dados mínimos de fallback
    return {
      countries: [
        { name: 'Brazil', code: 'BR', lat: -14.2350, lon: -51.9253, population: 215313498 },
        { name: 'United States', code: 'US', lat: 39.8283, lon: -98.5795, population: 331002651 }
      ],
      cities: [
        { name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'BR', population: 12325232 },
        { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US', population: 8336817 }
      ],
      lastUpdated: Date.now()
    };
  }

  async getEnvironmentalData(lat: number, lon: number): Promise<any> {
    try {
      // Simular chamada para OpenWeatherMap API
      // Em produção: fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`)
      
      return {
        temperature: 15 + Math.random() * 20,
        windSpeed: Math.random() * 25,
        humidity: 40 + Math.random() * 40,
        pressure: 1000 + Math.random() * 50,
        co2: 400 + Math.random() * 50
      };
    } catch (error) {
      console.warn('Failed to fetch environmental data:', error);
      return {
        temperature: 20,
        windSpeed: 10,
        humidity: 60,
        pressure: 1013,
        co2: 415
      };
    }
  }

  async getNASAImagery(lat: number, lon: number, date: string): Promise<string | null> {
    try {
      // Simular chamada para NASA GIBS
      // Em produção: construir URL da NASA GIBS baseada em coordenadas e data
      
      return `https://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${date}/EPSG4326_250m/{z}/{y}/{x}.jpg`;
    } catch (error) {
      console.warn('Failed to fetch NASA imagery:', error);
      return null;
    }
  }
}

export const geoDataService = new GeoDataService();