export interface AtmosphericCO2 {
  ppm: number;
  trend: number;
  date: string;
}

let _cache: AtmosphericCO2 | null = null;
let _fetchedAt = 0;
const TTL = 60 * 60 * 1000; // 1 hour

export async function fetchAtmosphericCO2(): Promise<AtmosphericCO2 | null> {
  if (_cache && Date.now() - _fetchedAt < TTL) return _cache;
  try {
    const res = await fetch('https://global-warming.org/api/co2-api', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const entries: { year: string; month: string; day: string; cycle: string; trend: string }[] =
      json.co2 ?? [];
    if (!entries.length) return null;
    const last = entries[entries.length - 1];
    _cache = {
      ppm: parseFloat(last.cycle),
      trend: parseFloat(last.trend),
      date: `${last.year}-${last.month.padStart(2, '0')}-${last.day.padStart(2, '0')}`,
    };
    _fetchedAt = Date.now();
    return _cache;
  } catch {
    return null;
  }
}
