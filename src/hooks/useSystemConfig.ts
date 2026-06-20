import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminRealDataService from '../services/adminRealDataService';
import { normalizeLanguage } from '../utils/languagePersistence';

// Chave de localStorage para o tema — mesma usada em Settings.tsx e main.tsx
const _themeKey = (userId = 'guest') => `theme:${userId}`;

function _localUserId(): string {
  try {
    return JSON.parse(localStorage.getItem('gaiamind-auth') || '{}')?.user?.id || 'guest';
  } catch { return 'guest'; }
}

export function useSystemConfig() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await AdminRealDataService.getSystemConfig();
        const normalizedLanguage = normalizeLanguage(config.language);

        // Sincronizar idioma (normalizar o valor do backend para evitar regressões pt-br → en)
        if (normalizedLanguage !== i18n.language) {
          await i18n.changeLanguage(normalizedLanguage);
          localStorage.setItem('language', normalizedLanguage);
        }

        // Tema: só aplica o valor do backend se o utilizador NÃO tiver
        // uma preferência guardada localmente (Settings.tsx usa localStorage)
        const localTheme = localStorage.getItem(_themeKey(_localUserId()));
        if (!localTheme) {
          // Sem preferência local → usar valor do backend
          applyDarkMode(config.dark_mode);
        }
        // Com preferência local → main.tsx já aplicou o tema correcto no arranque
        // não sobrescrever aqui
      } catch (error) {
        console.error('Error loading system config:', error);
        // Falha silenciosa — tema local continua activo
      }
    };

    loadConfig();
  }, [i18n]);

  const applyDarkMode = (darkMode: boolean) => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
      document.body.style.backgroundColor = '#0a0e27';
      document.body.style.color = '#e0f7fa';
    } else {
      document.documentElement.classList.add('light');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
  };

  const updateLanguage = async (language: string) => {
    try {
      const normalizedLanguage = normalizeLanguage(language);
      await AdminRealDataService.updateSystemConfig({
        language: normalizedLanguage,
        dark_mode: !document.documentElement.classList.contains('light'),
        auto_sync_interval_minutes: 15,
        auto_sync_enabled: true
      });
      await i18n.changeLanguage(normalizedLanguage);
      localStorage.setItem('language', normalizedLanguage);
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  const updateDarkMode = async (darkMode: boolean) => {
    // Aplicar mudança visual IMEDIATAMENTE
    applyDarkMode(darkMode);

    // Guardar no backend (falha silenciosa — localStorage já foi actualizado por Settings.tsx)
    try {
      await AdminRealDataService.updateSystemConfig({
        language: normalizeLanguage(i18n.language),
        dark_mode: darkMode,
        auto_sync_interval_minutes: 15,
        auto_sync_enabled: true
      });
    } catch (error) {
      console.error('Error updating dark mode:', error);
    }
  };

  return { updateLanguage, updateDarkMode };
}
