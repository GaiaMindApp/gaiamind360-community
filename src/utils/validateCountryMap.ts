#!/usr/bin/env node

/**
 * Script de Validação do Mapa de Países
 * Testa todos os aliases e garante que não há conflitos
 */

import { COUNTRY_MAP, extractCountryFromQuery, normalizeCountry } from './countryMap';

interface ValidationResult {
  total_aliases: number;
  unique_countries: number;
  aliases_per_country: { [key: string]: number };
  test_cases: {
    passed: number;
    failed: number;
    errors: string[];
  };
}

const result: ValidationResult = {
  total_aliases: 0,
  unique_countries: 0,
  aliases_per_country: {},
  test_cases: {
    passed: 0,
    failed: 0,
    errors: [],
  },
};

// 1. Contar aliases e países únicos
console.log('📊 Analisando mapa de países...\n');

result.total_aliases = Object.keys(COUNTRY_MAP).length;
const uniqueCountries = new Set(Object.values(COUNTRY_MAP));
result.unique_countries = uniqueCountries.size;

// Contar aliases por país
for (const [alias, country] of Object.entries(COUNTRY_MAP)) {
  if (!result.aliases_per_country[country]) {
    result.aliases_per_country[country] = 0;
  }
  result.aliases_per_country[country]++;
}

console.log(`✅ Total de aliases: ${result.total_aliases}`);
console.log(`✅ Total de países únicos: ${result.unique_countries}\n`);

// 2. Testar casos de uso comuns
console.log('🧪 Testando casos de uso...\n');

const testCases = [
  // Português
  { input: 'alemanha', expected: 'Germany', type: 'normalize' },
  { input: 'brasil', expected: 'Brazil', type: 'normalize' },
  { input: 'rússia', expected: 'Russia', type: 'normalize' },
  { input: 'china', expected: 'China', type: 'normalize' },
  { input: 'portugal', expected: 'Portugal', type: 'normalize' },
  { input: 'espanha', expected: 'Spain', type: 'normalize' },
  { input: 'frança', expected: 'France', type: 'normalize' },
  { input: 'itália', expected: 'Italy', type: 'normalize' },
  { input: 'reino unido', expected: 'United Kingdom', type: 'normalize' },
  { input: 'índia', expected: 'India', type: 'normalize' },
  { input: 'japão', expected: 'Japan', type: 'normalize' },
  { input: 'angola', expected: 'Angola', type: 'normalize' },
  { input: 'eua', expected: 'United States', type: 'normalize' },
  { input: 'usa', expected: 'United States', type: 'normalize' },
  { input: 'uk', expected: 'United Kingdom', type: 'normalize' },

  // Inglês
  { input: 'germany', expected: 'Germany', type: 'normalize' },
  { input: 'brazil', expected: 'Brazil', type: 'normalize' },
  { input: 'russia', expected: 'Russia', type: 'normalize' },
  { input: 'united states', expected: 'United States', type: 'normalize' },
  { input: 'united kingdom', expected: 'United Kingdom', type: 'normalize' },

  // Case insensitivity
  { input: 'ALEMANHA', expected: 'Germany', type: 'normalize' },
  { input: 'Brasil', expected: 'Brazil', type: 'normalize' },
  { input: 'RÚSSIA', expected: 'Russia', type: 'normalize' },

  // Queries
  { input: 'Qual é a tendência de CO2 na Alemanha?', expected: 'Germany', type: 'extract' },
  { input: 'Como evoluiu o CO2 no Brasil?', expected: 'Brazil', type: 'extract' },
  { input: 'Dados de emissões da Rússia', expected: 'Russia', type: 'extract' },
  { input: 'China e suas emissões', expected: 'China', type: 'extract' },
  { input: 'Portugal está melhorando?', expected: 'Portugal', type: 'extract' },
  { input: 'Emissões nos EUA', expected: 'United States', type: 'extract' },
  { input: 'Angola e Brasil comparação', expected: 'Angola', type: 'extract' },
];

for (const testCase of testCases) {
  let actual: string | null = null;

  if (testCase.type === 'normalize') {
    actual = normalizeCountry(testCase.input);
  } else if (testCase.type === 'extract') {
    actual = extractCountryFromQuery(testCase.input);
  }

  if (actual === testCase.expected) {
    result.test_cases.passed++;
    console.log(`✅ ${testCase.type}("${testCase.input}") → ${actual}`);
  } else {
    result.test_cases.failed++;
    const error = `❌ ${testCase.type}("${testCase.input}") → Expected: ${testCase.expected}, Got: ${actual}`;
    result.test_cases.errors.push(error);
    console.log(error);
  }
}

console.log(`\n📈 Resultados dos testes:`);
console.log(`✅ Passou: ${result.test_cases.passed}`);
console.log(`❌ Falhou: ${result.test_cases.failed}`);

// 3. Listar países com mais aliases
console.log(`\n🏆 Top 10 países com mais aliases:\n`);

const sortedCountries = Object.entries(result.aliases_per_country)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

sortedCountries.forEach(([country, count], index) => {
  console.log(`${index + 1}. ${country}: ${count} aliases`);
});

// 4. Verificar duplicatas
console.log(`\n🔍 Verificando duplicatas...\n`);

const aliasMap: { [key: string]: string[] } = {};
for (const [alias, country] of Object.entries(COUNTRY_MAP)) {
  if (!aliasMap[alias]) {
    aliasMap[alias] = [];
  }
  aliasMap[alias].push(country);
}

let duplicates = 0;
for (const [alias, countries] of Object.entries(aliasMap)) {
  if (countries.length > 1) {
    console.log(`⚠️  Alias "${alias}" mapeia para múltiplos países: ${countries.join(', ')}`);
    duplicates++;
  }
}

if (duplicates === 0) {
  console.log('✅ Nenhuma duplicata encontrada!');
}

// 5. Resumo final
console.log(`\n${'='.repeat(60)}`);
console.log('📊 RESUMO FINAL');
console.log(`${'='.repeat(60)}`);
console.log(`Total de aliases: ${result.total_aliases}`);
console.log(`Total de países: ${result.unique_countries}`);
console.log(`Média de aliases por país: ${(result.total_aliases / result.unique_countries).toFixed(2)}`);
console.log(`Testes passados: ${result.test_cases.passed}/${testCases.length}`);
console.log(`Taxa de sucesso: ${((result.test_cases.passed / testCases.length) * 100).toFixed(1)}%`);
console.log(`${'='.repeat(60)}\n`);

// Exportar resultado
if (result.test_cases.failed === 0 && duplicates === 0) {
  console.log('✅ Validação completa com sucesso!');
  process.exit(0);
} else {
  console.log('❌ Validação falhou!');
  process.exit(1);
}
