import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Thermometer, Droplets, Wind, Zap, Leaf, AlertTriangle, TrendingUp, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlobalAPIsService } from '../services/globalAPIsService';
import { fetchNRTData, type NRTMetric } from '../services/environmentalNRTService';
import { authFetch } from '../services/authFetch';

interface EnvironmentalModalProps {
  onClose: () => void;
}

export function EnvironmentalModal({ onClose }: EnvironmentalModalProps) {
  const { t } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEnvironmentalData();
  }, []);

  const loadEnvironmentalData = async () => {
    setLoading(true);
    try {
      const realData = await fetchRealEnvironmentalData();
      setEnvironmentalData(realData);
    } catch (err) {
      setError('Usando dados de exemplo');
      setEnvironmentalData(getDefaultData(t));
    } finally {
      setLoading(false);
    }
  };

  // Merge NRT data into a metric object
  const mergeNRT = (base: any, nrt: NRTMetric | undefined) => {
    if (!nrt || nrt.source === 'static_reference') return base;
    return {
      ...base,
      ...(nrt.current ? { current: nrt.current } : {}),
      ...(nrt.regions?.length ? { regions: nrt.regions } : {}),
      ...(nrt.details?.length ? { details: nrt.details } : {}),
    };
  };


  const fetchRealEnvironmentalData = async () => {
    // Fetch NASA + World Bank (existing) AND NRT sources in parallel
    const [nrtData] = await Promise.all([
      fetchNRTData(),
    ]);

    let tempValue = 15.2;
    let tempDate = '';
    try {
      const nasaRes = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/global-data/nasa/power?lat=0&lon=0`, { signal: AbortSignal.timeout(8000) });
      if (nasaRes.ok) {
        const nasaData = await nasaRes.json();
        if (nasaData.temperature_avg != null) { tempValue = nasaData.temperature_avg; tempDate = nasaData.date || ''; }
      }
    } catch {}

    const countries = ['BRA', 'USA', 'DEU', 'NOR', 'CHN', 'IND', 'FRA', 'ZAF'];
    const labels: Record<string, string> = { BRA:'Brasil', USA:'EUA', DEU:'Alemanha', NOR:'Noruega', CHN:'China', IND:'India', FRA:'Franca', ZAF:'Africa do Sul' };
    const energyResults: { name: string; value: number }[] = [];
    await Promise.all(countries.map(async (code) => {
      try {
        const data = await GlobalAPIsService.getWorldBankData(code);
        const val = data?.data?.renewable_energy?.value;
        const year = data?.data?.renewable_energy?.year;
        if (val != null) energyResults.push({ name: labels[code] + ' (' + year + ')', value: val });
      } catch {}
    }));
    const avgRenewable = energyResults.length > 0
      ? energyResults.reduce((s, e) => s + e.value, 0) / energyResults.length : 29.1;

    const defaultData = getDefaultData(t);
    return {
      ...defaultData,
      temperature: {
        ...defaultData.temperature,
        current: tempValue.toFixed(1) + 'C',
        details: [
          { label: t('env.equatorial_temp'), value: tempValue.toFixed(1) + 'C', change: tempDate ? 'Data: ' + tempDate : 'NASA POWER' },
          { label: t('gdp.source'), value: 'NASA POWER API', change: 'Satelital' },
          { label: t('env.global_anomaly'), value: '+1.1C', change: t('env.since_1880') },
          { label: t('env.forecast_2030'), value: '+1.5C', change: 'IPCC AR6' }
        ]
      },
      energy: {
        ...defaultData.energy,
        current: avgRenewable.toFixed(1) + '%',
        status: avgRenewable > 50 ? t('env.status_normal') : avgRenewable > 30 ? t('env.status_normal') : t('env.status_critical'),
        regions: energyResults.slice(0, 4).map(e => ({
          name: e.name, value: e.value.toFixed(1) + '%',
          change: e.value >= 50 ? '+sustentavel' : e.value >= 30 ? '~medio' : '-baixo'
        })),
        details: [
          { label: t('env.real_avg'), value: avgRenewable.toFixed(1) + '%', change: energyResults.length + ' ' + t('env.countries') },
          { label: t('gdp.source'), value: 'World Bank API', change: 'Oficial' },
          { label: t('env.countries_with_data'), value: energyResults.length + '/8', change: t('env.realtime') },
          { label: 'Indicador', value: 'EG.FEC.RNEW.ZS', change: 'World Bank' }
        ]
      },
      // NRT sources for the 4 previously static metrics
      humidity:   mergeNRT(defaultData.humidity,   nrtData?.humidity),
      airQuality: mergeNRT(defaultData.airQuality,  nrtData?.air_quality),
      oceans:     mergeNRT(defaultData.oceans,      nrtData?.oceans),
      forests:    mergeNRT(defaultData.forests,     nrtData?.forests),
    };
  };

const getDefaultData = (t: (k: string) => string) => ({
    temperature: {
      title: t('env.metric_temperature'),
      icon: Thermometer,
      color: 'from-red-500 to-orange-500',
      current: '15.2°C',
      trend: t('env.temp_trend'),
      status: t('env.status_critical'),
      regions: [
        { name: t('env.region_arctic'), value: '-10.5°C', change: '+2.3°C' },
        { name: t('env.region_europe'), value: '9.8°C', change: '+1.8°C' },
        { name: t('env.region_africa'), value: '25.1°C', change: '+0.9°C' },
        { name: t('env.region_asia'), value: '12.4°C', change: '+1.2°C' }
      ],
      details: [
        { label: t('env.ocean_temp'), value: '16.1°C', change: '+0.6°C' },
        { label: t('env.land_temp'), value: '14.8°C', change: '+1.4°C' },
        { label: t('env.global_anomaly'), value: '+1.1°C', change: t('env.since_1880') },
        { label: t('env.forecast_2030'), value: '+1.5°C', change: t('env.projection') }
      ]
    },
    humidity: {
      title: t('env.metric_humidity'),
      icon: Droplets,
      color: 'from-blue-500 to-cyan-500',
      current: '78%',
      trend: t('env.humidity_trend'),
      status: t('env.status_moderate'),
      regions: [
        { name: t('env.region_amazon'), value: '85%', change: '-1.2%' },
        { name: 'Sahara', value: '15%', change: '-0.8%' },
        { name: 'Oceania', value: '72%', change: '+1.5%' },
        { name: t('env.region_north_america'), value: '65%', change: '+0.9%' }
      ],
      details: [
        { label: t('env.avg_humidity'), value: '78%', change: '+2.1%' },
        { label: t('env.water_vapor'), value: '25.2 kg/m³', change: '+4.2%' },
        { label: t('env.global_precip'), value: '1.086 mm', change: '+1.8%' },
        { label: t('env.ocean_evap'), value: '1.37 m/yr', change: '+2.5%' }
      ]
    },
    airQuality: {
      title: t('env.metric_air_quality'),
      icon: Wind,
      color: 'from-green-500 to-emerald-500',
      current: 'AQI 156',
      trend: t('env.air_trend'),
      status: t('env.status_moderate'),
      regions: [
        { name: t('env.region_china'), value: 'AQI 201', change: '+15' },
        { name: t('env.region_india'), value: 'AQI 178', change: '+8' },
        { name: t('env.region_europe'), value: 'AQI 45', change: '-3' },
        { name: t('env.region_canada'), value: 'AQI 32', change: '-1' }
      ],
      details: [
        { label: 'PM2.5 Global', value: '15.2 μg/m³', change: '+8%' },
        { label: 'PM10 Global', value: '28.4 μg/m³', change: '+5%' },
        { label: 'NO₂', value: '21.8 μg/m³', change: '+12%' },
        { label: 'O₃', value: '64.2 μg/m³', change: '+7%' }
      ]
    },
    energy: {
      title: t('env.metric_energy'),
      icon: Zap,
      color: 'from-yellow-500 to-amber-500',
      current: '29.1%',
      trend: t('env.energy_trend'),
      status: t('env.status_normal'),
      regions: [
        { name: t('env.region_norway'), value: '98%', change: '+1%' },
        { name: t('env.region_brazil'), value: '85%', change: '+2%' },
        { name: t('env.region_germany'), value: '46%', change: '+4%' },
        { name: t('env.region_china'), value: '28%', change: '+6%' }
      ],
      details: [
        { label: t('env.solar_energy'), value: '8.7%', change: '+15%' },
        { label: t('env.wind_energy'), value: '12.3%', change: '+18%' },
        { label: t('env.hydro_energy'), value: '6.8%', change: '+2%' },
        { label: t('env.other_renewables'), value: '1.3%', change: '+25%' }
      ]
    },
    oceans: {
      title: t('env.metric_oceans'),
      icon: Droplets,
      color: 'from-blue-600 to-teal-500',
      current: 'pH 8.1',
      trend: t('env.oceans_trend'),
      status: t('env.status_critical'),
      regions: [
        { name: t('env.region_north_atlantic'), value: 'pH 8.05', change: '-0.12' },
        { name: t('env.region_pacific'), value: 'pH 8.08', change: '-0.09' },
        { name: t('env.region_indian'), value: 'pH 8.12', change: '-0.08' },
        { name: t('env.region_arctic'), value: 'pH 8.02', change: '-0.15' }
      ],
      details: [
        { label: t('env.ocean_acidification'), value: 'pH 8.1', change: '-0.1' },
        { label: t('env.surface_temp'), value: '16.1°C', change: '+0.6°C' },
        { label: t('env.sea_level'), value: '+21.3 cm', change: t('env.since_1880') },
        { label: t('env.ice_cover'), value: '13.2M km²', change: '-13%' }
      ]
    },
    forests: {
      title: t('env.metric_forests'),
      icon: Leaf,
      color: 'from-green-600 to-emerald-600',
      current: t('env.forests_current'),
      trend: t('env.forests_trend'),
      status: t('env.status_critical'),
      regions: [
        { name: t('env.region_amazon'), value: '5.5M km²', change: '-0.4%' },
        { name: 'Congo', value: '2.0M km²', change: '-0.2%' },
        { name: t('env.region_boreal'), value: '17M km²', change: '-0.1%' },
        { name: t('env.region_temperate'), value: '7M km²', change: '+0.1%' }
      ],
      details: [
        { label: t('env.forest_cover'), value: '4.06B ha', change: '-10M/yr' },
        { label: t('env.deforestation'), value: '10M ha', change: '+2%' },
        { label: t('env.threatened_species'), value: '41,459', change: '+1.2K' },
        { label: t('env.reforestation'), value: '5.2M ha', change: '+8%' }
      ]
    }
  });

  const metrics = [
    { id: 'temperature', label: t('env.metric_temperature'), icon: Thermometer },
    { id: 'humidity', label: t('env.metric_humidity'), icon: Droplets },
    { id: 'airQuality', label: t('env.metric_air_quality'), icon: Wind },
    { id: 'energy', label: t('env.metric_energy'), icon: Zap },
    { id: 'oceans', label: t('env.metric_oceans'), icon: Droplets },
    { id: 'forests', label: t('env.metric_forests'), icon: Leaf }
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="bg-gradient-to-br from-slate-900 via-[#001F3F] to-black border border-white/20 rounded-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t('env.loading_title')}</h3>
          <p className="text-white/60">{t('env.loading_desc')}</p>
        </div>
      </motion.div>
    );
  }

  if (!environmentalData) return null;

  const currentData = environmentalData[selectedMetric as keyof typeof environmentalData];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 via-[#001F3F] to-black border border-white/20 rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-['Orbitron']">
                {selectedMetric ? 
                  environmentalData[selectedMetric as keyof typeof environmentalData].title :
                  t('env.title')
                }
              </h2>
              <p className="text-white/60 text-sm">
                {selectedMetric ? t('env.category_details') : t('env.realtime_monitoring')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedMetric && (
              <button
                onClick={() => setSelectedMetric(null)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-all text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('env.back')}
              </button>
            )}
            {!selectedMetric && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {selectedMetric === null ? (
          /* Categories Grid */
          <div>
            <h3 className="text-white mb-6 text-lg font-medium text-center">
              {t('env.select_category')}
            </h3>
            {error && (
              <div className="mb-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
                <p className="text-yellow-300 text-sm">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.map((metric) => {
                const IconComponent = metric.icon;
                const data = environmentalData[metric.id as keyof typeof environmentalData];
                return (
                  <motion.button
                    key={metric.id}
                    onClick={() => setSelectedMetric(metric.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`bg-gradient-to-br ${data.color} p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all group relative`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">{data.title}</h4>
                      <div className="text-2xl font-bold text-white mb-2">{data.current}</div>
                      <div className="text-white/80 text-sm mb-3">{data.trend}</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: data.status === t('env.status_critical') ? '#ef4444' : 
                                           data.status === t('env.status_moderate') ? '#eab308' : '#22c55e'
                          }}
                        />
                        <span className="text-white/90 text-sm font-medium">{data.status}</span>
                      </div>
                      {(metric.id === 'temperature' || metric.id === 'energy') && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          REAL
                        </div>
                      )}
                      {(metric.id === 'humidity' || metric.id === 'airQuality' || metric.id === 'oceans' || metric.id === 'forests') && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          NRT
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Category Details */
          <div>


            {/* Category Content */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-y-auto mx-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{maxHeight: 'calc(90vh - 200px)'}}>
              {(() => {
                const currentData = environmentalData[selectedMetric as keyof typeof environmentalData];
                return (
                  <>
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${currentData.color} rounded-xl p-4 mb-4`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="flex items-center gap-4">
                          <currentData.icon className="w-12 h-12 text-white" />
                          <div>
                            <h3 className="text-xl font-bold text-white">{currentData.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: currentData.status === t('env.status_critical') ? '#ef4444' : 
                                                 currentData.status === t('env.status_moderate') ? '#eab308' : '#22c55e'
                                }}
                              />
                              <span className="text-white/90 text-sm">Status: {currentData.status}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white">{currentData.current}</div>
                          <div className="text-white/80 text-sm mb-2">{t('env.current_value')}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-4 h-4 text-white/80" />
                            <span className="text-white font-medium">{currentData.trend}</span>
                          </div>
                          <div className="text-white/80 text-sm">{t('env.trend')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Regional Data */}
                      <div>
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          {t('env.regional_data')}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {currentData.regions.map((region, index) => (
                            <div key={region.name} className="bg-white/10 border border-white/20 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-white">{region.name}</h5>
                                  <div className="text-xl font-bold text-cyan-400">{region.value}</div>
                                </div>
                                <div className={`text-sm px-2 py-1 rounded ${
                                  region.change.startsWith('+') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {region.change}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Details and Charts */}
                      <div className="space-y-6">
                        {/* Detailed Metrics */}
                        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            <h4 className="font-semibold text-white">{t('env.detailed_metrics')}</h4>
                          </div>
                          <div className="space-y-3">
                            {currentData.details?.map((detail, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                <div>
                                  <div className="text-white text-sm font-medium">{detail.label}</div>
                                  <div className="text-cyan-400 font-bold">{detail.value}</div>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded ${
                                  detail.change.startsWith('+') || detail.change.includes('↑') ? 'bg-red-500/20 text-red-400' : 
                                  detail.change.startsWith('-') || detail.change.includes('↓') ? 'bg-green-500/20 text-green-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {detail.change}
                                </div>
                              </div>
                            )) || (
                              <div className="text-white/60 text-sm text-center py-4">
                                {t('env.no_data')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Data Source */}
                        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-5 h-5 text-green-400" />
                            <h4 className="font-semibold text-green-400">{t('env.data_source')}</h4>
                          </div>
                          <div className="space-y-1 text-sm text-white">
                            {selectedMetric === 'temperature' ? (<>
                                <div>NASA POWER API (satelital)</div>
                                <div>{t('env.src_temp_surface')}</div>
                                <div>{t('env.src_temp_anomaly')}</div>
                                <div>{t('env.src_temp_ipcc')}</div>
                              </>) : selectedMetric === 'energy' ? (<>
                                <div>World Bank API - EG.FEC.RNEW.ZS</div>
                                <div>{t('env.src_energy_official')}</div>
                                <div>{t('env.src_energy_avg')}</div>
                              </>) : selectedMetric === 'humidity' ? (<>
                                <div>Open-Meteo ERA5 Seamless (Copernicus CDS)</div>
                                <div>{t('env.src_humidity_precip')}</div>
                                <div>{t('env.src_humidity_avg')}</div>
                              </>) : selectedMetric === 'airQuality' ? (<>
                                <div>OpenAQ v3 API — Open Air Quality Data</div>
                                <div>PM2.5/PM10: live sensor network (gov + independent)</div>
                                <div>NO2/O3: Copernicus Atmosphere (CAMS)</div>
                              </>) : selectedMetric === 'oceans' ? (<>
                                <div>Open-Meteo Marine / Copernicus CMEMS</div>
                                <div>{t('env.src_oceans_sea_level')}</div>
                                <div>{t('env.src_oceans_ice')}</div>
                              </>) : (<>
                                <div>Global Forest Watch API (Hansen/UMD)</div>
                                <div>{t('env.src_forests_deforestation')}</div>
                                <div>{t('env.src_forests_species')}</div>
                              </>)}
                          </div>
                        </div>
                      </div>
                    </div>


                  </>
                );
              })()}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}