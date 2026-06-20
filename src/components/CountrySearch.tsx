import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { complete195Countries as worldCountriesData, WorldCountry } from '../data/complete195Countries';

interface CountrySearchProps {
  onCountrySelect: (country: WorldCountry) => void;
}

export function CountrySearch({ onCountrySelect }: CountrySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCountries = worldCountriesData.filter(country =>
    (country.country && country.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (country.capital && country.capital.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 8);

  const handleCountryClick = (country: WorldCountry) => {
    onCountrySelect(country);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-[min(320px,calc(100vw-80px))]"
    >
      <div className="relative">
        <div className="flex items-center bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg">
          <Search className="w-4 h-4 text-white/60 ml-3" />
          <input
            type="text"
            placeholder="Buscar país ou capital..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(e.target.value.length > 0);
            }}
            className="flex-1 bg-transparent text-white placeholder-white/60 px-3 py-2 text-sm focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsOpen(false);
              }}
              className="text-white/60 hover:text-white mr-3"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {isOpen && filteredCountries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-1 w-full bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg max-h-64 overflow-y-auto"
          >
            {filteredCountries.map((country, index) => (
              <button
                key={index}
                onClick={() => handleCountryClick(country)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm font-medium">{country.country || 'N/A'}</div>
                    <div className="text-white/60 text-xs">{country.capital || 'N/A'}</div>
                  </div>
                  <div className="text-white/40 text-xs">{country.continent}</div>
                </div>
              </button>
            ))}
            
            {searchTerm && filteredCountries.length === 0 && (
              <div className="px-4 py-3 text-white/60 text-sm">
                Nenhum país encontrado
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}