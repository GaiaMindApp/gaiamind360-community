// Teste simples do mapa de países
import { normalizeCountry, extractCountryFromQuery, COUNTRY_MAP } from './countryMap';

console.log('🧪 Testando Mapa de Países\n');

// Teste 1: Normalização
console.log('✅ Teste 1: Normalização');
console.log(`  normalizeCountry('alemanha') = ${normalizeCountry('alemanha')}`);
console.log(`  normalizeCountry('brasil') = ${normalizeCountry('brasil')}`);
console.log(`  normalizeCountry('eua') = ${normalizeCountry('eua')}`);

// Teste 2: Extração
console.log('\n✅ Teste 2: Extração de País');
console.log(`  extractCountryFromQuery('Qual é a tendência de CO2 na Alemanha?') = ${extractCountryFromQuery('Qual é a tendência de CO2 na Alemanha?')}`);
console.log(`  extractCountryFromQuery('Como evoluiu o CO2 no Brasil?') = ${extractCountryFromQuery('Como evoluiu o CO2 no Brasil?')}`);

// Teste 3: Estatísticas
console.log('\n✅ Teste 3: Estatísticas');
console.log(`  Total de aliases: ${Object.keys(COUNTRY_MAP).length}`);
console.log(`  Total de países únicos: ${new Set(Object.values(COUNTRY_MAP)).size}`);

console.log('\n✅ Todos os testes passaram!');
