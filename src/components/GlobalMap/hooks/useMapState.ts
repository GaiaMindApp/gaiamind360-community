import { useState, useCallback, useEffect } from 'react';
import { getCapitalWeather, CapitalWeather } from '../../../services/weatherService';
import { complete195Countries as worldCountriesData } from '../../../data/complete195Countries';

export type MapPage = 'map' | 'environmental' | 'compare' | 'export' | 'apis' | 'country-data';

export interface MapState {
  currentPage: MapPage;
  selectedCountry: any | null;
  selectedContinent: string | null;
  showEnvironmental: boolean;
  weather: CapitalWeather | null;
  weatherLoading: boolean;
  weatherTab: 'temperatura' | 'chuva' | 'vento';
  showGlobalData: boolean;
}

export function useMapState() {
  const [currentPage, setCurrentPage] = useState<MapPage>('map');
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [showEnvironmental, setShowEnvironmental] = useState(false);
  const [weather, setWeather] = useState<CapitalWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherTab, setWeatherTab] = useState<'temperatura' | 'chuva' | 'vento'>('temperatura');
  const [showGlobalData, setShowGlobalData] = useState(false);

  // Carregar weather quando país muda
  useEffect(() => {
    if (!selectedCountry) { setWeather(null); return; }
    setWeather(null);
    setWeatherLoading(true);
    getCapitalWeather(selectedCountry.latitude, selectedCountry.longitude)
      .then(setWeather)
      .finally(() => setWeatherLoading(false));
  }, [selectedCountry?.country]);

  const navigateTo = useCallback((page: MapPage) => {
    setCurrentPage(page);
  }, []);

  const selectCountry = useCallback((country: any | null) => {
    setSelectedCountry(country);
    if (country) setCurrentPage('map');
  }, []);

  const selectCountryByName = useCallback((name: string | null) => {
    if (!name) { setSelectedCountry(null); return; }
    const found = worldCountriesData.find(c => c.country === name);
    setSelectedCountry(found || null);
  }, []);

  const closeCountry = useCallback(() => {
    setSelectedCountry(null);
    setShowGlobalData(false);
  }, []);

  const retryWeather = useCallback(() => {
    if (!selectedCountry) return;
    setWeather(null);
    setWeatherLoading(true);
    getCapitalWeather(selectedCountry.latitude, selectedCountry.longitude)
      .then(setWeather)
      .finally(() => setWeatherLoading(false));
  }, [selectedCountry]);

  return {
    currentPage, navigateTo,
    selectedCountry, selectCountry, selectCountryByName, closeCountry,
    selectedContinent, setSelectedContinent,
    showEnvironmental, setShowEnvironmental,
    weather, weatherLoading, weatherTab, setWeatherTab, retryWeather,
    showGlobalData, setShowGlobalData,
  };
}
