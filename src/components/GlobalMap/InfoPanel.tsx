import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Thermometer, Wind, Droplets, Users, Factory, Leaf, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { getWeatherData, type WeatherData } from './WeatherAPI';

interface LocationData {
  location?: {
    name: string;
    lat: number;
    lon: number;
    type: string;
    population?: number;
  };
  country?: {
    name: string;
    capital: string;
    population: number;
  };
  environmental?: {
    temperature: number;
    windSpeed: number;
    humidity: number;
    co2: number;
    renewableEnergy: number;
    seaLevel: number;
  };
}

interface InfoPanelProps {
  data: LocationData | null;
  onClose: () => void;
}

export function InfoPanel({ data, onClose }: InfoPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [localTime, setLocalTime] = useState('');

  // Buscar dados meteorológicos reais quando a localização muda
  useEffect(() => {
    if (!data?.location) return;
    let isMounted = true;
    setLoadingWeather(true);
    setWeather(null);
    getWeatherData(data.location.lat, data.location.lon)
      .then(w => { if (isMounted) { setWeather(w); setLoadingWeather(false); } })
      .catch(() => { if (isMounted) setLoadingWeather(false); });
    return () => { isMounted = false; };
  }, [data?.location?.lat, data?.location?.lon]);

  // Relógio em tempo real usando o timezone do país
  useEffect(() => {
    if (!weather?.timezone) return;
    const tick = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: weather.timezone });
      const day = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: weather.timezone });
      setLocalTime(`${day.charAt(0).toUpperCase() + day.slice(1)}, ${time}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [weather?.timezone]);

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute right-4 top-16 bottom-16 w-80 bg-black/95 backdrop-blur-md border border-white/20 text-white z-30 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div>
          <h2 className="text-sm font-light tracking-wider">
            {data.location?.name?.toUpperCase() || data.country?.name?.toUpperCase() || 'LOCATION'}
          </h2>
          {data.location && (
            <p className="text-xs text-white/60 mt-1">
              {data.location.lat.toFixed(2)}°, {data.location.lon.toFixed(2)}°
            </p>
          )}
        </div>
        <Button
          onClick={onClose}
          size="sm"
          variant="ghost"
          className="w-6 h-6 p-0 text-white/60 hover:text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Environmental Data */}
      <div className="p-4 space-y-4">
        {/* Hora local em tempo real */}
        {localTime && (
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Clock className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-300">{localTime}</span>
          </div>
        )}

        <div>
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
            {loadingWeather ? 'A carregar...' : 'Dados Meteorológicos'}
          </h3>
          {weather && (
            <div className="text-xs text-white/70 mb-3 italic">{weather.weatherLabel}</div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-400" />
                <span className="text-xs">Temperatura</span>
              </div>
              <span className="text-xs">
                {weather ? `${weather.temperature}°C (sente ${weather.feelsLike}°C)` : '---'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-blue-400" />
                <span className="text-xs">Vento</span>
              </div>
              <span className="text-xs">{weather ? `${weather.windSpeed} km/h` : '---'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span className="text-xs">Humidade</span>
              </div>
              <span className="text-xs">{weather ? `${weather.humidity}%` : '---'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-gray-400" />
                <span className="text-xs">CO₂ (estimado)</span>
              </div>
              <span className="text-xs">~415 ppm</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-400" />
                <span className="text-xs">Energia Renovável</span>
              </div>
              <span className="text-xs text-white/50">ver Insights</span>
            </div>
          </div>
        </div>

        {/* Location Info */}
        {data.location && (
          <div className="pt-4 border-t border-white/20">
            <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
              Location Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/60">Type</span>
                <span className="capitalize">{data.location.type}</span>
              </div>
              {data.location.population && (
                <div className="flex justify-between">
                  <span className="text-white/60">Population</span>
                  <span>{data.location.population.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Country Info */}
        {data.country && (
          <div className="pt-4 border-t border-white/20">
            <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
              Country Data
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/60">Capital</span>
                <span>{data.country.capital}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Population</span>
                <span>{(data.country.population / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        )}

        {/* Gaia Mind Analysis */}
        <div className="pt-4 border-t border-white/20">
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
            Gaia Mind Analysis
          </h3>
          <p className="text-xs text-white/80 leading-relaxed">
            {getAnalysis(data.location?.name || data.country?.name || 'this location')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function getAnalysis(locationName: string): string {
  const analyses = [
    `${locationName} shows moderate environmental stability with potential for renewable energy expansion.`,
    `Climate patterns in ${locationName} indicate rising temperatures requiring adaptive measures.`,
    `${locationName} demonstrates strong potential for sustainable development initiatives.`,
    `Environmental monitoring suggests ${locationName} needs enhanced conservation efforts.`
  ];
  
  return analyses[Math.floor(Math.random() * analyses.length)];
}