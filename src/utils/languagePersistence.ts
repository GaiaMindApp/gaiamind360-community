export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(value: string | null | undefined, fallback: SupportedLanguage = 'en'): SupportedLanguage {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  const short = normalized.split('-')[0];

  if (SUPPORTED_LANGUAGES.includes(short as SupportedLanguage)) {
    return short as SupportedLanguage;
  }

  return fallback;
}
