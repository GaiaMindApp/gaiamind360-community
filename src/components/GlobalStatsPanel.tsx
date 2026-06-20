import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { complete195Countries as worldCountriesData } from '../data/complete195Countries';
import { countriesData } from '../data/countriesData';
import { GlobalAPIsService, WorldBankData } from '../services/globalAPIsService';
import { fetchAtmosphericCO2, AtmosphericCO2 } from '../services/co2AtmosphericService';
import { authFetch } from '../services/authFetch';
import { ALL_UN_COUNTRIES } from '../data/allUNCountries';
import { 
  Globe, 
  Users, 
  MapPin, 
  Maximize, 
  Earth, 
  Zap, 
  Building2, 
  DollarSign, 
  Cloud, 
  Trees, 
  AlertTriangle, 
  Leaf, 
  TrendingUp, 
  Bell,
  Brain,
  BarChart3,
  Sun,
  X
} from 'lucide-react';
import { CompareCountriesModal } from './CompareCountriesModal';

interface GlobalStatsPanelProps {
  selectedContinent: string | null;
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
  showEnvironmental: boolean;
  onToggleEnvironmental: () => void;
  onNavigate?: (page: string) => void;
}

interface DataItem {
  id: number;
  label: string;
  value: number;
  icon: React.ComponentType<any>;
  suffix?: string;
  color: string;
}

const mockCountryData: { [key: string]: any } = {
  Brasil: {
    capital: "Brasília",
    continent: "América do Sul",
    population: "213 milhões",
    language: "Português",
    gdp: 72,
    energy: 85,
    co2: 42,
    forest: 59,
  },
  Portugal: {
    capital: "Lisboa",
    continent: "Europa",
    population: "10.3M",
    language: "Português",
    gdp: 72,
    energy: 88,
    co2: 38,
    forest: 35,
  },
  China: {
    capital: "Pequim",
    continent: "Ásia",
    population: "1.4B",
    language: "Mandarim",
    gdp: 98,
    energy: 95,
    co2: 82,
    forest: 23,
  },
  "Estados Unidos": {
    capital: "Washington D.C.",
    continent: "América do Norte",
    population: "331M",
    language: "Inglês",
    gdp: 95,
    energy: 21,
    co2: 85,
    forest: 33,
  },
  França: {
    capital: "Paris",
    continent: "Europa",
    population: "65.3M",
    language: "Francês",
    gdp: 78,
    energy: 23,
    co2: 45,
    forest: 31,
  },
  Alemanha: {
    capital: "Berlim",
    continent: "Europa",
    population: "83.8M",
    language: "Alemão",
    gdp: 82,
    energy: 46,
    co2: 48,
    forest: 32,
  },
  Japão: {
    capital: "Tóquio",
    continent: "Ásia",
    population: "125.8M",
    language: "Japonês",
    gdp: 85,
    energy: 20,
    co2: 65,
    forest: 68,
  },
  Índia: {
    capital: "Nova Delhi",
    continent: "Ásia",
    population: "1.38B",
    language: "Hindi",
    gdp: 45,
    energy: 38,
    co2: 55,
    forest: 24,
  },
  Canadá: {
    capital: "Ottawa",
    continent: "América do Norte",
    population: "38M",
    language: "Inglês/Francês",
    gdp: 88,
    energy: 68,
    co2: 52,
    forest: 34,
  },
  Austrália: {
    capital: "Camberra",
    continent: "Oceania",
    population: "25.5M",
    language: "Inglês",
    gdp: 79,
    energy: 24,
    co2: 58,
    forest: 17,
  },
};

// Module-level cache — survives component unmount/remount
const _sustainabilityCache: Record<string, number> = {};
let _sustainabilityFetched = false;

export function GlobalStatsPanel({
  selectedContinent,
  selectedCountry,
  onCountrySelect,
  showEnvironmental,
  onToggleEnvironmental,
  onNavigate,
}: GlobalStatsPanelProps) {
  const { t } = useTranslation();
  const { getRole } = useAuth();
  const role = getRole();
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0, 0]);
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCountryDetails, setShowCountryDetails] = useState(false);
  const [selectedCountryDetails, setSelectedCountryDetails] = useState<any>(null);
  const [countryData, setCountryData] = useState<WorldBankData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [atmosphericCO2, setAtmosphericCO2] = useState<AtmosphericCO2 | null>(null);

  useEffect(() => {
    fetchAtmosphericCO2().then(setAtmosphericCO2);
  }, []);

  const [sustainabilityCache, setSustainabilityCache] = useState<Record<string, number>>(_sustainabilityCache);
  const sustainabilityFetched = useRef(_sustainabilityFetched);

  useEffect(() => {
    if (sustainabilityFetched.current) return;
    sustainabilityFetched.current = true;
    _sustainabilityFetched = true;
    const controller = new AbortController();
    ALL_UN_COUNTRIES.slice(0, 8).forEach(async (c) => {
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/global-data/worldbank/${c.code}`, {
          signal: controller.signal
        });
        if (!res.ok) return;
        const data = await res.json();
        const renewable = data?.data?.renewable_energy?.value ?? 0;
        const co2 = data?.data?.co2_emissions?.value ?? 10;
        const forest = data?.data?.forest_area?.value ?? 20;
        const score = Math.min(100, Math.max(0, Math.round(
          (renewable / 100) * 40 + Math.max(0, 30 - (co2 / 20) * 30) + (forest / 100) * 30
        )));
        _sustainabilityCache[c.code] = score;
        setSustainabilityCache(prev => ({ ...prev, [c.code]: score }));
      } catch {}
    });
    return () => controller.abort();
  }, []);

  const [reportDataCache, setReportDataCache] = useState<Record<string, { sustainability: number; co2: string; renewable: string }>>({});

  const buildCountryReportData = async () => {
    const results: Record<string, { sustainability: number; co2: string; renewable: string }> = {};
    // Use /countries/all which returns top 20 emitters in one request
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/global-data/countries/all`, {
        signal: AbortSignal.timeout(20000)
      });
      if (res.ok) {
        const json = await res.json();
        const countries = json.countries || [];
        for (const item of countries) {
          const name = item.country_code;
          const renewable = item.data?.renewable_energy?.value ?? null;
          const co2 = item.data?.co2_emissions?.value ?? null;
          const forest = item.data?.forest_area?.value ?? null;
          if (renewable == null && co2 == null && forest == null) continue;
          const score = Math.min(100, Math.max(0, Math.round(
            ((renewable ?? 20) / 100) * 40 +
            Math.max(0, 30 - ((co2 ?? 5) / 20) * 30) +
            ((forest ?? 20) / 100) * 30
          )));
          // map ISO3 -> country name via worldCountriesData
          const match = worldCountriesData.find(c => c.iso2 && name.startsWith(c.iso2.substring(0,2)));
          const key = match?.country ?? name;
          results[key] = {
            sustainability: score,
            co2: co2 != null ? co2.toFixed(2) : 'N/A',
            renewable: renewable != null ? renewable.toFixed(1) : 'N/A'
          };
        }
      }
    } catch {}
    // Fill remaining from countriesData (local static data)
    for (const c of countriesData) {
      if (!results[c.name]) {
        const co2num = parseFloat(c.co2Emissions);
        const rennum = parseFloat(c.renewableEnergy);
        results[c.name] = {
          sustainability: c.sustainabilityScore,
          co2: isNaN(co2num) ? c.co2Emissions : co2num.toFixed(2),
          renewable: isNaN(rennum) ? c.renewableEnergy : rennum.toFixed(1)
        };
      }
    }
    setReportDataCache(results);
    return results;
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const dataItems: DataItem[] = [
    { id: 1, label: t('map.countries'),        value: 195, icon: Globe,    color: 'text-pink-400' },
    { id: 2, label: t('map.continents'),       value: 7,   icon: Earth,    color: 'text-blue-300' },
    { id: 3, label: t('map.population_total'), value: 8.0, icon: Users,    suffix: 'B',     color: 'text-amber-200' },
    { id: 4, label: t('map.total_area'),       value: 510, icon: Maximize, suffix: 'M km²', color: 'text-green-300' },
  ];

  useEffect(() => {
    const animateValues = () => {
      const durations = [1500, 1000, 2000, 2500];
      const finalValues = dataItems.map(item => item.value);

      const animations = finalValues.map((finalValue, index) => {
        return new Promise<void>((resolve) => {
          const startTime = Date.now();
          const duration = durations[index];
          
          const updateValue = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            setAnimatedValues(prev => {
              const newValues = [...prev];
              newValues[index] = Math.floor(progress * finalValue);
              return newValues;
            });

            if (progress < 1) {
              requestAnimationFrame(updateValue);
            } else {
              resolve();
            }
          };
          
          updateValue();
        });
      });

      Promise.all(animations);
    };

    animateValues();
  }, []);

  const formatValue = (value: number, index: number) => {
    const item = dataItems[index];
    if (item.suffix) {
      return `${value}${item.suffix}`;
    }
    return value.toString();
  };

  const loadCountryData = async (countryName: string) => {
    const country = ALL_UN_COUNTRIES.find(c => c.name === countryName);
    if (country) {
      setSelectedCountryInfo(country);
      setShowCountryModal(true);
      setLoading(true);
      try {
        const data = await GlobalAPIsService.getWorldBankData(country.code);
        setCountryData(data);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
      setLoading(false);
    }
  };

  const getSustainabilityColor = (value: number) => {
    if (value >= 70) return '#00e676';
    if (value >= 40) return '#ffd700';
    return '#ff4444';
  };

  const generateReport = async (format: 'html' | 'csv' | 'json' | 'txt') => {
    const cache = Object.keys(reportDataCache).length > 0 ? reportDataCache : await buildCountryReportData();
    if (format === 'html') generateHTMLReport(cache);
    else if (format === 'csv') generateCSVReport(cache);
    else if (format === 'json') generateJSONReport(cache);
    else if (format === 'txt') generateTXTReport(cache);
  };

    const reportCountries = [...worldCountriesData].sort((a, b) => a.continent.localeCompare(b.continent)).reduce((acc, c) => {
    const existing = acc.filter(x => x.continent === c.continent).length;
    if (existing < 8) acc.push(c);
    return acc;
  }, [] as typeof worldCountriesData).slice(0, 50);

  const generateHTMLReport = (cache: Record<string, { sustainability: number; co2: string; renewable: string }>) => {
    // Escapar HTML para prevenir XSS (CWE-79/80)
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
    const reportData = {
      timestamp: new Date().toISOString(),
      globalStats: dataItems.map((item, index) => ({
        label: item.label,
        value: animatedValues[index],
        suffix: item.suffix || ''
      })),
      countries: reportCountries.map(country => {
        const detailed = countriesData.find(c => c.name === country.country);
        return {
          name: country.country,
          capital: country.capital,
          continent: country.continent,
          population: country.population,
          area: country.area,
          sustainability: cache[country.country]?.sustainability ?? detailed?.sustainabilityScore ?? 0,
          co2: cache[country.country]?.co2 ?? detailed?.co2Emissions ?? 'N/A',
          renewable: cache[country.country]?.renewable ?? detailed?.renewableEnergy ?? 'N/A'
        };
      }),
      aiInsights: [
        t('report.insight_1'),
        t('report.insight_2'),
        t('report.insight_3'),
        t('report.insight_4'),
        t('report.insight_5')
      ]
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GaiaMind - ${t('report.html_title')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #001F3F, #003366); color: white; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .title { font-size: 2.5rem; font-weight: bold; color: #00FFCC; margin-bottom: 10px; }
    .subtitle { font-size: 1.2rem; color: #EAEAEA; opacity: 0.8; }
    .section { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 30px; margin-bottom: 30px; border: 1px solid rgba(0,255,204,0.3); }
    .section-title { font-size: 1.5rem; color: #00FFCC; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .stat-card { background: rgba(0,255,204,0.1); padding: 20px; border-radius: 10px; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #00FFCC; }
    .stat-label { font-size: 0.9rem; color: #EAEAEA; margin-top: 5px; }
    .countries-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .countries-table th, .countries-table td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .countries-table th { background: rgba(0,255,204,0.2); color: #00FFCC; }
    .sustainability-high { color: #22c55e; font-weight: bold; }
    .sustainability-medium { color: #eab308; font-weight: bold; }
    .sustainability-low { color: #ef4444; font-weight: bold; }
    .insights-list { list-style: none; }
    .insights-list li { background: rgba(0,255,204,0.1); padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #00FFCC; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); }
    .timestamp { color: #EAEAEA; opacity: 0.7; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🌍 GaiaMind - ${t('report.html_title')}</h1>
      <p class="subtitle">${t('report.html_subtitle')}</p>
      <p class="timestamp">${t('report.generated_at')}: ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
      <h2 class="section-title">📊 ${t('report.global_stats')}</h2>
      <div class="stats-grid">
        ${reportData.globalStats.map(stat => `
          <div class="stat-card">
            <div class="stat-value">${esc(String(stat.value))}${esc(String(stat.suffix ?? ''))}</div>
            <div class="stat-label">${esc(String(stat.label))}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🤖 ${t('report.ai_insights')}</h2>
      <ul class="insights-list">
        ${reportData.aiInsights.map(insight => `<li>${esc(String(insight))}</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2 class="section-title">🗺️ ${t('report.countries_analysis')}</h2>
      <table class="countries-table">
        <thead>
          <tr>
            <th>${t('report.col_country')}</th>
            <th>${t('map.capital')}</th>
            <th>${t('map.continent')}</th>
            <th>${t('report.col_sustainability')}</th>
            <th>CO₂ (t/capita)</th>
            <th>${t('map.renewable')}</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.countries.map(country => `
            <tr>
              <td>${esc(String(country.name))}</td>
              <td>${esc(String(country.capital))}</td>
              <td>${esc(String(country.continent))}</td>
              <td class="${
                country.sustainability >= 70 ? 'sustainability-high' :
                country.sustainability >= 50 ? 'sustainability-medium' : 'sustainability-low'
              }">${esc(String(country.sustainability))}%</td>
              <td>${esc(String(country.co2))}t</td>
              <td>${esc(String(country.renewable))}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>🌱 ${t('map.footer')}</p>
      <p>${t('report.html_footer_sub')}</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GaiaMind_Relatorio_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  };

  const generateCSVReport = (cache: Record<string, { sustainability: number; co2: string; renewable: string }>) => {
    const csvData = [
      [t('report.col_country'), t('map.capital'), t('map.continent'), t('map.population_total'), t('map.area'), t('report.col_sustainability'), 'CO2', t('map.renewable')],
      ...reportCountries.map(country => {
        const detailed = countriesData.find(c => c.name === country.country);
        return [
          country.country,
          country.capital,
          country.continent,
          country.population || 'N/A',
          country.area || 'N/A',
          `${cache[country.country]?.sustainability ?? detailed?.sustainabilityScore ?? 0}%`,
          `${cache[country.country]?.co2 ?? detailed?.co2Emissions ?? "N/A"}t`,
          `${cache[country.country]?.renewable ?? detailed?.renewableEnergy ?? "N/A"}%`
        ];
      })
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    downloadFile(csvContent, 'text/csv', 'csv');
  };

  const generateJSONReport = (cache: Record<string, { sustainability: number; co2: string; renewable: string }>) => {
    const jsonData = {
      timestamp: new Date().toISOString(),
      globalStats: dataItems.map((item, index) => ({
        label: item.label,
        value: animatedValues[index],
        suffix: item.suffix || ''
      })),
      countries: reportCountries.map(country => {
        const detailed = countriesData.find(c => c.name === country.country);
        return {
          name: country.country,
          capital: country.capital,
          continent: country.continent,
          population: country.population,
          area: country.area,
          sustainability: cache[country.country]?.sustainability ?? detailed?.sustainabilityScore ?? 0,
          co2: cache[country.country]?.co2 ?? detailed?.co2Emissions ?? 'N/A',
          renewable: cache[country.country]?.renewable ?? detailed?.renewableEnergy ?? 'N/A'
        };
      })
    };
    
    downloadFile(JSON.stringify(jsonData, null, 2), 'application/json', 'json');
  };

  const generateTXTReport = (cache: Record<string, { sustainability: number; co2: string; renewable: string }>) => {
    const txtContent = `
🌍 GAIAMIND - ${t('report.txt_title')}
${'='.repeat(60)}
${t('report.generated_at')}: ${new Date().toLocaleString()}

📊 ${t('report.global_stats')}:
${dataItems.map((item, index) => `• ${item.label}: ${animatedValues[index]}${item.suffix || ''}`).join('\n')}

🗺️ ${t('report.countries_analysis')} (Top 50):
${reportCountries.map(country => {
  const detailed = countriesData.find(c => c.name === country.country);
  const sustainability = cache[country.country]?.sustainability ?? detailed?.sustainabilityScore ?? 0;
  return `${country.country} (${country.continent}) - ${t('report.col_sustainability')}: ${sustainability}%`;
}).join('\n')}

🤖 ${t('report.ai_insights')}:
• ${t('report.insight_1')}
• ${t('report.insight_2')}
• ${t('report.insight_3')}
• ${t('report.insight_4')}
• ${t('report.insight_5')}

${t('map.footer')}
`;
    
    downloadFile(txtContent, 'text/plain', 'txt');
  };

  const downloadFile = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GaiaMind_Relatorio_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
    showNotification(`🎉 Relatório ${extension.toUpperCase()} gerado com sucesso!`);
  };

  return (
    <div className="component-container">
      <div className="component-wrapper">

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--accent-green)', margin: 0 }}>
            {t('map.panel_title')}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {t('map.data_based')}
          </p>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid-auto" style={{ marginBottom: '1rem' }}>
          {dataItems.map((item, index) => {
            const IconComponent = item.icon;
            const colors = ['#0B57D0','#34A853','#F59E0B','#9333EA'];
            return (
              <div key={item.id} className="card-base" style={{ borderColor: `${colors[index]}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: `${colors[index]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconComponent style={{ width: '1.25rem', height: '1.25rem', color: colors[index] }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{formatValue(animatedValues[index], index)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CO₂ ATMOSFÉRICO ── */}
        <div className="insights-card" style={{ marginBottom: '1rem', borderColor: 'rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <Cloud style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-warning)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CO₂ Atmosférico Global</div>
                <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: 700, color: 'var(--color-warning)' }}>
                  {atmosphericCO2 ? `${atmosphericCO2.ppm.toFixed(2)} ppm` : '...'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {atmosphericCO2 ? t('map.co2_trend', { trend: atmosphericCO2.trend.toFixed(2), date: atmosphericCO2.date }) : t('map.loading')}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('map.noaa_source')}</div>
              <div style={{
                marginTop: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                background: atmosphericCO2 && atmosphericCO2.ppm > 420 ? 'rgba(220,38,38,0.1)' : 'rgba(52,168,83,0.1)',
                color: atmosphericCO2 && atmosphericCO2.ppm > 420 ? '#DC2626' : '#34A853',
                border: `1px solid ${atmosphericCO2 && atmosphericCO2.ppm > 420 ? 'rgba(220,38,38,0.3)' : 'rgba(52,168,83,0.3)'}`
              }}>
                {atmosphericCO2 && atmosphericCO2.ppm > 420 ? t('map.status_above_threshold') : t('map.status_normal')}
              </div>
            </div>
          </div>
        </div>

        {/* ── GRID: LEGENDA + PAÍSES (Controlos removidos — estão na navbar) ── */}
        <div className="grid-2" style={{ marginBottom: '1rem' }}>

          {/* Legenda */}
          <div className="insights-card">
            <h3 className="insights-card-title">
              🗺️ {t('map.legend')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>{t('map.sustainability')}</div>
                {[['#34A853', t('map.high')], ['#F59E0B', t('map.medium')], ['#DC2626', t('map.low')]].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>{t('map.alerts')}</div>
                {[['#DC2626', t('map.critical')], ['#F59E0B', t('map.moderate')], ['#34A853', t('map.normal')]].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-normal)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', animation: 'h2-pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>{t('map.realtime')}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {t('map.last_update')}: {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Países */}
          <div className="insights-card">
            <h3 className="insights-card-title">
              🌐 {t('map.countries_list')}
            </h3>
            <input
              type="text"
              placeholder={t('map.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-responsive"
              style={{ marginBottom: '0.75rem' }}
            />
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <div className="grid-2">
                {(() => {
                  const filtered = searchTerm.length > 0
                    ? ALL_UN_COUNTRIES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()))
                    : ALL_UN_COUNTRIES.slice(0, 8);
                  return filtered.slice(0, 8).map(country => {
                    const score = sustainabilityCache[country.code];
                    const hasScore = score !== undefined;
                    return (
                      <button
                        key={country.code}
                        onClick={() => loadCountryData(country.name)}
                        className="card-base"
                        style={{ padding: '0.5rem', textAlign: 'center', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{country.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{country.code}</div>
                        <div style={{
                          fontSize: '0.7rem', fontWeight: 700, marginTop: '0.2rem',
                          color: hasScore ? getSustainabilityColor(score!) : 'var(--text-muted)'
                        }}>
                          {hasScore ? `${score}%` : '...'}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-normal)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {([
              { page: 'environmental', icon: '🌿', labelKey: 'map.environmental' },
              { page: 'compare',       icon: '⚖️', labelKey: 'map.compare'      },
              { page: 'export',        icon: '📥', labelKey: 'map.export'       },
            ].filter(item => role !== 'user' || item.page !== 'export')).map(item => (
              <button
                key={item.page}
                onClick={() => onNavigate?.(item.page)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.85rem', borderRadius: '50px', border: '1px solid rgba(52,168,83,0.3)', cursor: 'pointer', fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)', fontWeight: 500, background: 'rgba(52,168,83,0.1)', color: 'var(--text-secondary)', minHeight: '36px' }}
              >
                <span>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{t('map.footer')}</p>
        </div>

        {/* ── MODAIS ── */}

        {/* Country Modal — via portal para garantir z-index correcto */}
        {showCountryModal && selectedCountryInfo && createPortal(
          <div
            onClick={() => { setShowCountryModal(false); setSelectedCountryInfo(null); setCountryData(null); }}
            style={{
              position: 'fixed',
              top: 'var(--header-height, 56px)',
              left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              overflowY: 'auto',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="global-stats-country-modal-card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-normal)',
                borderRadius: '16px',
                padding: '1.25rem',
                width: '100%',
                maxWidth: '520px',
                maxHeight: 'calc(100vh - var(--header-height, 56px) - 2rem)',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}
            >
              {/* Header com botao fechar bem visivel */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', gap:'0.75rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', minWidth:0, flex:1 }}>
                  {/* Flag image — reliable cross-platform rendering */}
                  <img
                    src={`https://flagcdn.com/32x24/${selectedCountryInfo.code.slice(0,2).toLowerCase()}.png`}
                    alt={selectedCountryInfo.name}
                    width={28}
                    height={21}
                    style={{ borderRadius:'3px', flexShrink:0, objectFit:'cover', border:'1px solid var(--border-normal)' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div style={{ minWidth:0 }}>
                    <h2 style={{ color:'var(--accent-green)', fontWeight:700, fontSize:'1rem', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedCountryInfo.name}</h2>
                    <p style={{ color:'var(--text-secondary)', fontSize:'0.72rem', margin:0 }}>{selectedCountryInfo.code} · {selectedCountryInfo.continent}</p>
                  </div>
                </div>
                <button
                  className="global-map-country-modal-close"
                  onClick={() => { setShowCountryModal(false); setSelectedCountryInfo(null); setCountryData(null); }}
                  style={{ width:'32px', height:'32px', minWidth:'32px', background:'var(--bg-input)', border:'1px solid var(--border-normal)', borderRadius:'50%', color:'var(--text-secondary)', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                  aria-label="Fechar"
                >×</button>
              </div>

              <div className="grid-3" style={{ marginBottom:'1rem' }}>
                {[
                  { label: t('map.capital'),   value: selectedCountryInfo.capital,   color: '#3b82f6' },
                  { label: t('map.continent'),  value: selectedCountryInfo.continent, color: '#a855f7' },
                  { label: t('map.iso_code'),   value: selectedCountryInfo.code,      color: '#22c55e' },
                ].map(item => (
                  <div key={item.label} className="card-base" style={{ borderColor:`${item.color}40` }}>
                    <div style={{ fontSize:'0.65rem', color:item.color, textTransform:'uppercase', marginBottom:'0.25rem' }}>{item.label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {loading && (
                <div style={{ textAlign:'center', padding:'2rem' }}>
                  <div style={{ display:'inline-block', width:'32px', height:'32px', border:'3px solid var(--accent-blue)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  <p style={{ color:'var(--text-secondary)', fontSize:'0.8rem', marginTop:'0.5rem' }}>{t('map.loading_eco')}</p>
                </div>
              )}

              {countryData && !loading && (
                <div>
                  <h3 style={{ color:'var(--accent-green)', fontWeight:600, marginBottom:'0.75rem', fontSize:'0.9rem' }}>{t('map.eco_data')}</h3>
                  <div className="grid-auto">
                    {[
                      countryData.data.gdp_per_capita   && { label:t('map.gdp'),              value:`$${Number(countryData.data.gdp_per_capita.value).toLocaleString(undefined,{maximumFractionDigits:0})}`,  year:countryData.data.gdp_per_capita.year,   color:'#22c55e' },
                      countryData.data.population       && { label:t('map.population_total'), value:`${(countryData.data.population.value/1e6).toFixed(1)}M`,                                                   year:countryData.data.population.year,       color:'#3b82f6' },
                      countryData.data.renewable_energy && { label:t('map.renewable'),        value:`${countryData.data.renewable_energy.value.toFixed(1)}%`,                                                   year:countryData.data.renewable_energy.year, color:'#eab308' },
                      countryData.data.co2_emissions    && { label:t('map.co2'),              value:`${countryData.data.co2_emissions.value.toFixed(2)} t`,                                                     year:countryData.data.co2_emissions.year,    color:'#ef4444' },
                      countryData.data.forest_area      && { label:t('map.forest'),           value:`${countryData.data.forest_area.value.toFixed(1)}%`,                                                        year:countryData.data.forest_area.year,      color:'#4ade80' },
                    ].filter(Boolean).map((item:any) => (
                      <div key={item.label} className="card-base" style={{ borderColor:`${item.color}40` }}>
                        <div style={{ fontSize:'0.65rem', color:item.color, textTransform:'uppercase', marginBottom:'0.25rem' }}>{item.label}</div>
                        <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>{item.value}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-secondary)' }}>Ano: {item.year}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:'0.65rem', color:'var(--text-secondary)', textAlign:'center', marginTop:'0.75rem' }}>{t('map.source_wb')}</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Compare Modal — mantido para uso futuro via prop */}
        <AnimatePresence>
          {false && <CompareCountriesModal onClose={() => {}} />}
        </AnimatePresence>

        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 4000, background: 'linear-gradient(90deg,#22c55e,#16a34a)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
          >
            {notification}
          </motion.div>
        )}

      </div>
    </div>
  );
}
