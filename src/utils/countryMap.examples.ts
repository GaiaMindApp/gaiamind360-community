/**
 * 🌍 Exemplos de Uso - Mapa de Países Global
 * 
 * Este arquivo demonstra como usar o novo sistema de mapa de países
 * com suporte a 195+ países e 400+ aliases
 */

import { 
  extractCountryFromQuery, 
  normalizeCountry, 
  COUNTRY_MAP 
} from './countryMap';

// ============================================
// EXEMPLO 1: Normalizar Nomes de Países
// ============================================

console.log('📍 EXEMPLO 1: Normalizar Nomes de Países\n');

// Português
console.log('Português:');
console.log(`  normalizeCountry('alemanha') → ${normalizeCountry('alemanha')}`);
console.log(`  normalizeCountry('brasil') → ${normalizeCountry('brasil')}`);
console.log(`  normalizeCountry('rússia') → ${normalizeCountry('rússia')}`);
console.log(`  normalizeCountry('portugal') → ${normalizeCountry('portugal')}`);

// Inglês
console.log('\nInglês:');
console.log(`  normalizeCountry('germany') → ${normalizeCountry('germany')}`);
console.log(`  normalizeCountry('brazil') → ${normalizeCountry('brazil')}`);
console.log(`  normalizeCountry('russia') → ${normalizeCountry('russia')}`);
console.log(`  normalizeCountry('portugal') → ${normalizeCountry('portugal')}`);

// Aliases
console.log('\nAliases:');
console.log(`  normalizeCountry('eua') → ${normalizeCountry('eua')}`);
console.log(`  normalizeCountry('usa') → ${normalizeCountry('usa')}`);
console.log(`  normalizeCountry('uk') → ${normalizeCountry('uk')}`);

// Case-insensitive
console.log('\nCase-insensitive:');
console.log(`  normalizeCountry('ALEMANHA') → ${normalizeCountry('ALEMANHA')}`);
console.log(`  normalizeCountry('Brasil') → ${normalizeCountry('Brasil')}`);
console.log(`  normalizeCountry('RÚSSIA') → ${normalizeCountry('RÚSSIA')}`);

// Whitespace handling
console.log('\nWhitespace handling:');
console.log(`  normalizeCountry('  portugal  ') → ${normalizeCountry('  portugal  ')}`);
console.log(`  normalizeCountry('  reino unido  ') → ${normalizeCountry('  reino unido  ')}`);

// ============================================
// EXEMPLO 2: Extrair País de Query
// ============================================

console.log('\n\n📍 EXEMPLO 2: Extrair País de Query\n');

const queries = [
  'Qual é a tendência de CO2 na Alemanha?',
  'Como evoluiu o CO2 no Brasil?',
  'Dados de emissões da Rússia',
  'China e suas emissões',
  'Portugal está melhorando?',
  'Emissões nos EUA',
  'Angola e Brasil comparação',
  'Que dia da semana é hoje?',
];

queries.forEach(query => {
  const country = extractCountryFromQuery(query);
  const safeQuery = query.replace(/[\r\n]/g, ' ');
  console.log(`Query: "${safeQuery}"`);
  console.log(`Country: ${country || 'Nenhum país encontrado'}\n`);
});

// ============================================
// EXEMPLO 3: Usar em Componente React
// ============================================

console.log('\n📍 EXEMPLO 3: Usar em Componente React\n');

const exampleReactCode = `
import { extractCountryFromQuery } from '../utils/countryMap';

export const GaiaMindDynamicChat = () => {
  const [input, setInput] = useState('');
  const [country, setCountry] = useState('Spain');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extrair país da pergunta
    const extractedCountry = extractCountryFromQuery(input) || country;
    setCountry(extractedCountry);
    
    console.log(\`Buscando dados CO2 para: \${extractedCountry}\`);
    
    // Enviar query com país correto
    const response = await sendQuery(input, extractedCountry, userId);
    
    // Buscar dados CO2 do país detectado
    if (response.analysis_type === 'co2_analysis') {
      const co2Data = await getCO2Trend(extractedCountry, userId);
      // ... processar dados
    }
  };

  return (
    <div>
      <p>País detectado: {country}</p>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="Faça uma pergunta..."
      />
      <button onClick={handleSendMessage}>Enviar</button>
    </div>
  );
};
`;

console.log(exampleReactCode);

// ============================================
// EXEMPLO 4: Usar em Backend Python
// ============================================

console.log('\n📍 EXEMPLO 4: Usar em Backend Python\n');

const examplePythonCode = `
from fastapi import FastAPI, HTTPException

@app.post("/api/agent/query")
async def process_query(request: QueryRequest):
    # O frontend envia o país já normalizado
    country = request.country  # Ex: "Germany", "Brazil", "Russia"
    
    print(f"Buscando dados CO2 para: {country}")
    
    # Usar país para buscar dados
    co2_data = get_co2_trend(country)
    
    if not co2_data:
        raise HTTPException(status_code=404, detail=f"Dados não encontrados para {country}")
    
    return {
        "country": country,
        "data": co2_data,
        "analysis_type": "co2_analysis"
    }
`;

console.log(examplePythonCode);

// ============================================
// EXEMPLO 5: Tratamento de Erros
// ============================================

console.log('\n📍 EXEMPLO 5: Tratamento de Erros\n');

const errorHandlingCode = `
// Verificar se país foi encontrado
const country = extractCountryFromQuery(userQuery);

if (!country) {
  console.log("❌ País não encontrado na pergunta");
  // Usar país padrão ou pedir ao usuário
  const country = 'Spain'; // fallback
}

// Usar país normalizado
const co2Data = await getCO2Trend(country);

if (!co2Data) {
  console.log(\`❌ Dados de CO2 não encontrados para \${country}\`);
  // Mostrar mensagem amigável ao usuário
}
`;

console.log(errorHandlingCode);

// ============================================
// EXEMPLO 6: Estatísticas do Mapa
// ============================================

console.log('\n📍 EXEMPLO 6: Estatísticas do Mapa\n');

const totalAliases = Object.keys(COUNTRY_MAP).length;
const uniqueCountries = new Set(Object.values(COUNTRY_MAP)).size;

console.log(`Total de aliases: ${totalAliases}`);
console.log(`Total de países únicos: ${uniqueCountries}`);
console.log(`Média de aliases por país: ${(totalAliases / uniqueCountries).toFixed(2)}`);

// Contar aliases por país
const aliasesPerCountry: { [key: string]: number } = {};
for (const [alias, country] of Object.entries(COUNTRY_MAP)) {
  if (!aliasesPerCountry[country]) {
    aliasesPerCountry[country] = 0;
  }
  aliasesPerCountry[country]++;
}

// Top 10 países com mais aliases
console.log('\nTop 10 países com mais aliases:');
Object.entries(aliasesPerCountry)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([country, count], index) => {
    console.log(`  ${index + 1}. ${country}: ${count} aliases`);
  });

// ============================================
// EXEMPLO 7: Validação de Entrada
// ============================================

console.log('\n\n📍 EXEMPLO 7: Validação de Entrada\n');

const validateCountryInput = (input: string): { valid: boolean; country: string | null; message: string } => {
  if (!input || input.trim().length === 0) {
    return {
      valid: false,
      country: null,
      message: '❌ Entrada vazia'
    };
  }

  const country = normalizeCountry(input);
  
  if (!country) {
    return {
      valid: false,
      country: null,
      message: `❌ País não reconhecido: "${input}"`
    };
  }

  return {
    valid: true,
    country,
    message: `✅ País válido: ${country}`
  };
};

// Testar validação
console.log(validateCountryInput('alemanha'));
console.log(validateCountryInput('brasil'));
console.log(validateCountryInput('país inexistente'));
console.log(validateCountryInput(''));

// ============================================
// EXEMPLO 8: Comparação de Múltiplos Países
// ============================================

console.log('\n📍 EXEMPLO 8: Comparação de Múltiplos Países\n');

const compareCountries = (query: string): string[] => {
  const countries: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Ordenar aliases por comprimento (maior primeiro)
  const sortedKeys = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (queryLower.includes(key)) {
      const country = COUNTRY_MAP[key];
      if (!countries.includes(country)) {
        countries.push(country);
      }
    }
  }
  
  return countries;
};

// Testar comparação
console.log('Query: "Angola e Brasil comparação"');
console.log('Países encontrados:', compareCountries('Angola e Brasil comparação'));

console.log('\nQuery: "Alemanha, França e Itália"');
console.log('Países encontrados:', compareCountries('Alemanha, França e Itália'));

// ============================================
// RESUMO
// ============================================

console.log('\n\n' + '='.repeat(60));
console.log('✅ RESUMO - Mapa de Países Global');
console.log('='.repeat(60));
console.log(`
✅ Total de países: ${uniqueCountries}
✅ Total de aliases: ${totalAliases}
✅ Suporte a português e inglês
✅ Case-insensitive
✅ Whitespace handling
✅ Extração automática de país em queries
✅ Tratamento de erros
✅ Validação de entrada
✅ Comparação de múltiplos países

📚 Documentação:
  - PAISES_SUPORTADOS.md
  - COUNTRY_MAP_README.md
  - IMPLEMENTACAO_MAPA_PAISES.md

🧪 Testes:
  npm test -- countryMap.test.ts

🔍 Validação:
  npm run validate:countries
`);
