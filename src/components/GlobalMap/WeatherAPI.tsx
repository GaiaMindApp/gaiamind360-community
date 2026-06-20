/**
 * WeatherAPI — dados meteorológicos reais via Open-Meteo (gratuito, sem API key)
 * https://open-meteo.com/
 */

export interface WeatherData {
  temperature: number;       // °C actual
  feelsLike: number;         // °C sensação térmica
  windSpeed: number;         // km/h
  humidity: number;          // %
  weatherCode: number;       // WMO weather code
  weatherLabel: string;      // descrição legível
  localTime: string;         // hora local HH:MM
  localDay: string;          // dia da semana
  timezone: string;
}

const WMO_LABELS: Record<number, string> = {
  0: 'Céu limpo', 1: 'Maioritariamente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Nevoeiro', 48: 'Nevoeiro com gelo',
  51: 'Chuvisco leve', 53: 'Chuvisco moderado', 55: 'Chuvisco intenso',
  61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva intensa',
  71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve intensa',
  80: 'Aguaceiros leves', 81: 'Aguaceiros moderados', 82: 'Aguaceiros intensos',
  95: 'Trovoada', 96: 'Trovoada com granizo', 99: 'Trovoada intensa',
};

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&timezone=auto&forecast_days=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    const tz: string = data.timezone || 'UTC';

    // Hora local do país
    const now = new Date();
    const localTime = now.toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const localDay = now.toLocaleDateString(navigator.language, { weekday: 'long', timeZone: tz });

    const code: number = c.weather_code ?? 0;
    return {
      temperature: Math.round(c.temperature_2m * 10) / 10,
      feelsLike: Math.round(c.apparent_temperature * 10) / 10,
      windSpeed: Math.round(c.wind_speed_10m * 10) / 10,
      humidity: Math.round(c.relative_humidity_2m),
      weatherCode: code,
      weatherLabel: WMO_LABELS[code] ?? 'Dados indisponíveis',
      localTime,
      localDay: localDay.charAt(0).toUpperCase() + localDay.slice(1),
      timezone: tz,
    };
  } catch {
    return null;
  }
}
