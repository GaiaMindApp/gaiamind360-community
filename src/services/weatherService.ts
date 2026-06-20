interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  co2: number;
  coordinates: [number, number];
}

interface ClimateLayer {
  type: 'temperature' | 'wind' | 'co2' | 'humidity';
  data: WeatherData[];
  timestamp: number;
}

export interface CapitalWeather {
  temperature: number;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  description: string;
  icon: string;
  weatherCode: number;
  timezone: string;
  hourly: { time: string; temp: number; rain: number; wind: number }[];
}

class WeatherService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getGlobalWeatherData(): Promise<ClimateLayer[]> {
    const cacheKey = 'global-weather';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Simulate real API data with realistic patterns
    const data = this.generateRealisticWeatherData();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  private generateRealisticWeatherData(): ClimateLayer[] {
    const temperatureData: WeatherData[] = [];
    const windData: WeatherData[] = [];
    const co2Data: WeatherData[] = [];

    // Generate data points across the globe
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lon = -180; lon <= 180; lon += 15) {
        const baseTemp = this.calculateBaseTemperature(lat);
        const seasonalVariation = Math.sin((Date.now() / (1000 * 60 * 60 * 24 * 365)) * 2 * Math.PI) * 10;
        
        temperatureData.push({
          temperature: baseTemp + seasonalVariation + (Math.random() - 0.5) * 5,
          humidity: 40 + Math.random() * 40,
          windSpeed: Math.random() * 15,
          windDirection: Math.random() * 360,
          pressure: 1013 + (Math.random() - 0.5) * 50,
          co2: 410 + Math.random() * 30,
          coordinates: [lon, lat]
        });
      }
    }

    return [
      { type: 'temperature', data: temperatureData, timestamp: Date.now() },
      { type: 'wind', data: temperatureData, timestamp: Date.now() },
      { type: 'co2', data: temperatureData, timestamp: Date.now() }
    ];
  }

  private calculateBaseTemperature(lat: number): number {
    // Simplified temperature model based on latitude
    const absLat = Math.abs(lat);
    if (absLat < 23.5) return 25; // Tropical
    if (absLat < 40) return 15;   // Subtropical
    if (absLat < 60) return 5;    // Temperate
    return -10;                   // Polar
  }
}

export const weatherService = new WeatherService();
export type { WeatherData, ClimateLayer };

const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const capitalWeatherCache = new Map<string, { data: CapitalWeather; ts: number }>();
let _pendingRequests = 0;
const _queue: Array<() => void> = [];

function _dequeue() {
  if (_queue.length > 0 && _pendingRequests < 2) {
    const next = _queue.shift()!;
    next();
  }
}

export async function getCapitalWeather(lat: number, lon: number): Promise<CapitalWeather | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = capitalWeatherCache.get(key);
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.data;

  // throttle: max 2 pedidos simultâneos
  if (_pendingRequests >= 2) {
    await new Promise<void>(resolve => _queue.push(resolve));
  }

  _pendingRequests++;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&hourly=temperature_2m,precipitation_probability,wind_speed_10m` +
      `&forecast_days=1&timezone=auto&forecast_hours=8`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const d = await res.json();

    // API retornou erro (ex: too many requests)
    if (d.error) return null;

    const code = d.current?.weathercode ?? 0;
    const icon = WMO_ICONS[code] ?? '🌡️';

    const hourly = (d.hourly?.time as string[] ?? []).slice(0, 8).map((t: string, i: number) => ({
      time: t.slice(11, 16),
      temp: Math.round(d.hourly.temperature_2m[i] ?? 0),
      rain: d.hourly.precipitation_probability[i] ?? 0,
      wind: Math.round(d.hourly.wind_speed_10m[i] ?? 0),
    }));

    const weather: CapitalWeather = {
      temperature: Math.round(d.current?.temperature_2m ?? 0),
      tempMax: Math.round(d.daily?.temperature_2m_max?.[0] ?? 0),
      tempMin: Math.round(d.daily?.temperature_2m_min?.[0] ?? 0),
      humidity: d.current?.relative_humidity_2m ?? 0,
      windSpeed: Math.round(d.current?.wind_speed_10m ?? 0),
      rainChance: d.daily?.precipitation_probability_max?.[0] ?? 0,
      description: '',
      icon,
      weatherCode: code,
      timezone: d.timezone ?? 'UTC',
      hourly,
    };

    capitalWeatherCache.set(key, { data: weather, ts: Date.now() });
    return weather;
  } catch {
    return null;
  } finally {
    _pendingRequests--;
    _dequeue();
  }
}