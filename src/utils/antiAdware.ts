/**
 * GaiaMind Runtime Anti-Adware & Anti-Injection
 * Monitoriza o DOM em tempo real e remove scripts/iframes não autorizados (injetados por extensões/malware).
 */

let initialized = false;

export function initAntiAdware() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement) {
          // 1. Bloquear IFRAMES — excluir iframes legítimos (Cesium infoBox, OAuth popups)
          if (node.tagName === 'IFRAME') {
            const src = (node as HTMLIFrameElement).src || '';
            const isLegitimate = src === '' || src === 'about:blank'
              || src.includes(window.location.origin)
              || node.classList.contains('cesium-infoBox-iframe');
            if (!isLegitimate) {
              console.warn('🛡️ [GaiaMind Security] Iframe não autorizado bloqueado e removido.');
              node.remove();
            }
          }
          // 2. Bloquear SCRIPTS externos não reconhecidos
          else if (node.tagName === 'SCRIPT') {
            const src = (node as HTMLScriptElement).src || '';
            const ALLOWED = [
              window.location.origin,
              'vercel.app',
              'cesium.com',          // Cesium CDN (Digital Twin Earth)
              'cesiumjs.org',        // Cesium alternate CDN
              'unpkg.com',           // Three.js textures
              'virtualearth.net',    // Cesium Bing Maps JSONP
              'bing.com',
            ];
            if (src && !ALLOWED.some(d => src.includes(d))) {
              console.warn(`🛡️ [GaiaMind Security] Script bloqueado: ${src}`);
              node.remove();
            }
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  console.log('🛡️ Runtime Security Observer Activo');
}