import { describe, expect, test } from 'vitest';
import { normalizeLanguage } from './languagePersistence';

describe('normalizeLanguage', () => {
  test('keeps supported language codes unchanged', () => {
    expect(normalizeLanguage('pt')).toBe('pt');
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage('fr')).toBe('fr');
  });

  test('normalizes region variants to the base supported language', () => {
    expect(normalizeLanguage('pt-BR')).toBe('pt');
    expect(normalizeLanguage('EN-US')).toBe('en');
  });

  test('falls back to english when the value is missing or unsupported', () => {
    expect(normalizeLanguage(null)).toBe('en');
    expect(normalizeLanguage('de')).toBe('en');
    expect(normalizeLanguage('')).toBe('en');
  });
});
