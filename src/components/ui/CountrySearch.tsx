import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { allWorldCountries, WorldCountry } from '../../data/allWorldCountries';

interface CountrySearchProps {
  value: string;
  onSelect: (countryCode: string) => void;
  placeholder?: string;
}

export function CountrySearch({ value, onSelect, placeholder = "Pesquisar país..." }: CountrySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allWorldCountries.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.capital.toLowerCase().includes(term) ||
      c.continent.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [searchTerm]);

  const handleSelect = (country: WorldCountry) => {
    onSelect(country.code);
    setSearchTerm(country.name);
    setIsOpen(false);
  };

  const clear = () => { onSelect(''); setSearchTerm(''); setIsOpen(false); };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-[#00E676] pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => { if (searchTerm.trim()) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 bg-[#003049]/60 border border-[#00E676]/30 rounded-md text-[#E0F7FA] placeholder-[#E0F7FA]/50 focus:outline-none focus:border-[#00E676] transition-colors"
        />
        {searchTerm && (
          <button onClick={clear} className="absolute right-2 p-1 hover:bg-[#00E676]/20 rounded">
            <X className="w-4 h-4 text-[#E0F7FA]/60" />
          </button>
        )}
      </div>

      {isOpen && filteredCountries.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#003049] border border-[#00E676]/30 rounded-md shadow-lg overflow-y-auto max-h-72">
          {filteredCountries.map((country) => (
            <div
              key={country.code}
              className="px-3 py-2 hover:bg-[#00E676]/10 cursor-pointer border-b border-[#00E676]/10 last:border-b-0"
              onMouseDown={() => handleSelect(country)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#E0F7FA] font-medium">{country.name}</div>
                  <div className="text-[#E0F7FA]/60 text-sm">{country.capital} • {country.continent}</div>
                </div>
                <div className="text-[#00E676] text-xs font-mono">{country.code}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
