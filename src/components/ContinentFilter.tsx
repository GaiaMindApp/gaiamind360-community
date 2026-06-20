import { motion } from 'motion/react';
import { complete195Countries as worldCountriesData } from '../data/complete195Countries';

interface ContinentFilterProps {
  selectedContinent: string | null;
  onContinentChange: (continent: string | null) => void;
}

export function ContinentFilter({ selectedContinent, onContinentChange }: ContinentFilterProps) {
  const continents = Array.from(new Set(worldCountriesData.map(country => country.continent)));
  
  const continentColors: { [key: string]: string } = {
    'América do Norte': '#10b981',
    'América Central': '#059669',
    'América do Sul': '#047857',
    'Caribe': '#065f46',
    'Europa': '#3b82f6',
    'Europa/Ásia': '#1d4ed8',
    'Ásia': '#1e40af',
    'Ásia/Europa': '#1e3a8a',
    'África': '#f59e0b',
    'Oceania': '#d97706'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute top-20 right-4 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg z-[1000] min-w-[200px]"
    >
      <h4 className="text-sm font-medium mb-3">Filtrar por Continente</h4>
      
      <div className="space-y-2">
        <button
          onClick={() => onContinentChange(null)}
          className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
            selectedContinent === null 
              ? 'bg-white/20 text-white' 
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Todos os Países ({worldCountriesData.length})
        </button>
        
        {continents.map((continent) => {
          const count = worldCountriesData.filter(country => country.continent === continent).length;
          const color = continentColors[continent] || '#6b7280';
          
          return (
            <button
              key={continent}
              onClick={() => onContinentChange(continent)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                selectedContinent === continent 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: color }}
              ></div>
              <span>{continent} ({count})</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-white/20">
        <p className="text-xs text-white/50">
          Clique para filtrar países por continente
        </p>
      </div>
    </motion.div>
  );
}