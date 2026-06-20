import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Wind, Thermometer, Leaf, Globe, Layers, Settings, Info, Zap, MapPin } from 'lucide-react';

interface MapControlsProps {
  visualMode: 'wind' | 'temperature' | 'vegetation' | 'political' | 'co2' | 'latin-america';
  onModeChange: (mode: 'wind' | 'temperature' | 'vegetation' | 'political' | 'co2' | 'latin-america') => void;
  layers: {
    temperature: boolean;
    wind: boolean;
    co2: boolean;
    humidity: boolean;
    cities: boolean;
  };
  onLayerToggle: (layer: string) => void;
}

export function MapControls({ visualMode, onModeChange, layers, onLayerToggle }: MapControlsProps) {
  const { t } = useTranslation();
  const modes = [
    { id: 'wind' as const, icon: Wind, labelKey: 'map.mode.wind', color: '#60a5fa' },
    { id: 'temperature' as const, icon: Thermometer, labelKey: 'map.mode.temperature', color: '#f87171' },
    { id: 'co2' as const, icon: Zap, labelKey: 'map.mode.co2', color: '#fbbf24' },
    { id: 'vegetation' as const, icon: Leaf, labelKey: 'map.mode.vegetation', color: '#4ade80' },
    { id: 'political' as const, icon: Globe, labelKey: 'map.mode.political', color: '#a78bfa' },
    { id: 'latin-america' as const, icon: MapPin, labelKey: 'map.mode.latin_america', color: '#f59e0b' }
  ];

  return (
    <>
      {/* Top Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = visualMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-all ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                style={isActive ? { color: mode.color } : {}}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(mode.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Layer Controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20"
      >
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Layers className="w-4 h-4" />
            <span>{t('map.layers')}</span>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.temperature}
                onChange={() => onLayerToggle('temperature')}
                className="w-3 h-3 rounded border-white/30 bg-transparent"
              />
              <span>{t('map.layer.temperature')}</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.wind}
                onChange={() => onLayerToggle('wind')}
                className="w-3 h-3 rounded border-white/30 bg-transparent"
              />
              <span>{t('map.layer.wind')}</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.co2}
                onChange={() => onLayerToggle('co2')}
                className="w-3 h-3 rounded border-white/30 bg-transparent"
              />
              <span>{t('map.layer.co2')}</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Info Controls */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
      >
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 space-y-3">
          <button className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors">
            <Settings className="w-4 h-4" />
            <span>{t('map.settings')}</span>
          </button>
          
          <button className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors">
            <Info className="w-4 h-4" />
            <span>{t('map.about')}</span>
          </button>
        </div>
      </motion.div>

      {/* Bottom Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2">
          <div className="flex items-center gap-6 text-xs text-white/60">
            <span>{t('map.mode_label', { mode: visualMode === 'latin-america' ? t('map.mode.latin_america') : t(`map.mode.${visualMode}`) })}</span>
            <span>•</span>
            <span>UTC: {new Date().toISOString().slice(0, 16).replace('T', ' ')}</span>
            <span>•</span>
            <span>{t('map.projection')}</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}