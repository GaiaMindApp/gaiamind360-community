import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/theme.css";
import "./styles/map.css";
import "./styles/risk-table-semantic.css";
import "./styles/light/index.css";
import "./i18n";
import { initAntiAdware } from './utils/antiAdware';
import { normalizeLanguage } from './utils/languagePersistence';
import { initWebVitals } from './utils/webVitals';

initAntiAdware();
initWebVitals();

// Rehidratar e normalizar o idioma antes do primeiro render
(function () {
  try {
    const language = normalizeLanguage(localStorage.getItem('language'));
    localStorage.setItem('language', language);
  } catch {}
})();

// Aplicar tema e tamanho de texto guardados por utilizador
(function () {
  try {
    const id = JSON.parse(localStorage.getItem('gaiamind-auth') || '{}')?.user?.id || 'guest';
    const theme = localStorage.getItem(`theme:${id}`) || 'dark';
    const fontSize = localStorage.getItem(`fontSize:${id}`) || 'medium';
    const sizeMap: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    if (theme === 'light') document.documentElement.classList.add('light');
    else if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)
      document.documentElement.classList.add('light');
    document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);
