import { describe, test, expect } from 'vitest';
import { extractCountryFromQuery, normalizeCountry, COUNTRY_MAP } from './countryMap';

describe('Country Map Tests', () => {
  test('should normalize Portuguese country names', () => {
    expect(normalizeCountry('brasil')).toBe('Brazil');
    expect(normalizeCountry('portugal')).toBe('Portugal');
    expect(normalizeCountry('espanha')).toBe('Spain');
  });

  test('should normalize English country names', () => {
    expect(normalizeCountry('germany')).toBe('Germany');
    expect(normalizeCountry('brazil')).toBe('Brazil');
    expect(normalizeCountry('russia')).toBe('Russia');
    expect(normalizeCountry('portugal')).toBe('Portugal');
    expect(normalizeCountry('spain')).toBe('Spain');
  });

  test('should handle case insensitivity', () => {
    expect(normalizeCountry('BRASIL')).toBe('Brazil');
    expect(normalizeCountry('Brasil')).toBe('Brazil');
    expect(normalizeCountry('PORTUGAL')).toBe('Portugal');
  });

  test('should extract country from queries', () => {
    expect(extractCountryFromQuery('How is Brazil doing?')).toBe('Brazil');
    expect(extractCountryFromQuery('Tell me about Portugal')).toBe('Portugal');
    expect(extractCountryFromQuery('Spain emissions')).toBe('Spain');
  });

  test('should handle aliases correctly', () => {
    expect(normalizeCountry('eua')).toBe('United States');
    expect(normalizeCountry('usa')).toBe('United States');
    expect(normalizeCountry('uk')).toBe('United Kingdom');
  });

  test('should return null for unknown countries', () => {
    expect(normalizeCountry('unknown country')).toBeNull();
    expect(normalizeCountry('xyz')).toBeNull();
  });

  test('should have all countries mapped', () => {
    const countryCount = Object.keys(COUNTRY_MAP).length;
    console.log(`Total de aliases de paises: ${countryCount}`);
    expect(countryCount).toBeGreaterThan(200);
  });

  test('should handle whitespace correctly', () => {
    expect(normalizeCountry('  brasil  ')).toBe('Brazil');
    expect(normalizeCountry('  portugal  ')).toBe('Portugal');
  });
});
