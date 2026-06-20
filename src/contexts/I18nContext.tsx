import React, { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../utils/languagePersistence';

interface I18nContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = React.useState(i18n.language);

  const setLanguage = async (lang: string) => {
    const normalizedLanguage = normalizeLanguage(lang);
    localStorage.setItem('language', normalizedLanguage);
    await i18n.changeLanguage(normalizedLanguage);
    setCurrentLanguage(normalizedLanguage);

    // Persist to backend silently — non-blocking, non-critical
    try {
      const { default: AdminRealDataService } = await import('../services/adminRealDataService');
      await AdminRealDataService.updateSystemConfig({
        language: normalizedLanguage,
        dark_mode: document.documentElement.classList.contains('dark'),
        auto_sync_interval_minutes: 15,
        auto_sync_enabled: true,
      });
    } catch {
      // Backend unavailable — language already saved to localStorage
    }
  };

  return (
    <I18nContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
