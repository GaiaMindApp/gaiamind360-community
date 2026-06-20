#!/usr/bin/env node

// Script de Validação do Mapa de Países
// Importar o mapa diretamente do arquivo TypeScript compilado

const fs = require('fs');
const path = require('path');

// Ler o arquivo countryMap.ts e extrair o COUNTRY_MAP
const countryMapPath = path.join(__dirname, 'countryMap.ts');
const content = fs.readFileSync(countryMapPath, 'utf-8');

// Extrair o objeto COUNTRY_MAP usando regex
const mapMatch = content.match(/export const COUNTRY_MAP.*?= \{([\s\S]*?)\};/);
if (!mapMatch) {
  console.error('❌ Não foi possível extrair COUNTRY_MAP');
  process.exit(1);
}

console.log('📊 Validação do Mapa de Países\n');

// Contar aliases
const aliasMatches = content.match(/'[^']+': '[^']+'/g) || [];
const totalAliases = aliasMatches.length;

// Contar países únicos
const countryMatches = content.match(/: '([^']+)'/g) || [];
const uniqueCountries = new Set(countryMatches.map(m => m.replace(": '", '').replace("'", ''))).size;

console.log(`✅ Total de aliases: ${totalAliases}`);
console.log(`✅ Total de países únicos: ${uniqueCountries}`);
console.log(`✅ Média de aliases por país: ${(totalAliases / uniqueCountries).toFixed(2)}\n`);

// Verificar alguns aliases importantes
const testAliases = [
  'brasil',
  'brazil',
  'portugal',
  'espanha',
  'spain',
  'eua',
  'usa',
  'uk',
  'germany',
  'alemanha',
];

console.log('🧪 Testando aliases importantes:\n');

let passed = 0;
let failed = 0;

for (const alias of testAliases) {
  const regex = new RegExp(`'${alias}':\\s*'([^']+)'`);
  const match = content.match(regex);
  
  if (match) {
    console.log(`✅ '${alias}' → '${match[1]}'`);
    passed++;
  } else {
    console.log(`❌ '${alias}' não encontrado`);
    failed++;
  }
}

console.log(`\n📈 Resultados:`);
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);

console.log(`\n${'='.repeat(60)}`);
console.log('📊 RESUMO FINAL');
console.log(`${'='.repeat(60)}`);
console.log(`Total de aliases: ${totalAliases}`);
console.log(`Total de países: ${uniqueCountries}`);
console.log(`Testes passados: ${passed}/${testAliases.length}`);
console.log(`Taxa de sucesso: ${((passed / testAliases.length) * 100).toFixed(1)}%`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log('✅ Validação completa com sucesso!');
  process.exit(0);
} else {
  console.log('❌ Validação falhou!');
  process.exit(1);
}
