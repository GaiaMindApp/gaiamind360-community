/**
 * CapitalsLayer — pins de capital de cada país no CesiumJS globe.
 * Aparecem ao fazer zoom (< 4000km altitude), desaparecem de longe.
 * Clicar num pin abre o CountryPanel com os dados TSI.
 */
import { useEffect, useRef } from 'react';
import { digitalTwinStore } from '../store/digitalTwinStore';
import { complete195Countries } from '../../../data/complete195Countries';

const AUTH_KEY = 'gaiamind-auth';
function getToken(): string {
  try {
    const s = localStorage.getItem(AUTH_KEY);
    return s ? JSON.parse(s)?.token ?? '' : '';
  } catch { return ''; }
}

// Mapa nome-país → ISO3 (subset dos principais; fallback por nome)
const NAME_TO_ISO3: Record<string, string> = {
  'Angola': 'AGO', 'Argélia': 'DZA', 'Egito': 'EGY', 'Etiópia': 'ETH',
  'Nigéria': 'NGA', 'África do Sul': 'ZAF', 'Quênia': 'KEN', 'Tanzânia': 'TZA',
  'Marrocos': 'MAR', 'Gana': 'GHA', 'Moçambique': 'MOZ', 'Madagáscar': 'MDG',
  'China': 'CHN', 'Índia': 'IND', 'Japão': 'JPN', 'Coreia do Sul': 'KOR',
  'Indonésia': 'IDN', 'Paquistão': 'PAK', 'Bangladesh': 'BGD', 'Filipinas': 'PHL',
  'Vietnã': 'VNM', 'Tailândia': 'THA', 'Turquia': 'TUR', 'Irã': 'IRN',
  'Iraque': 'IRQ', 'Arábia Saudita': 'SAU', 'Israel': 'ISR', 'Malásia': 'MYS',
  'Estados Unidos': 'USA', 'Canadá': 'CAN', 'México': 'MEX', 'Brasil': 'BRA',
  'Argentina': 'ARG', 'Colômbia': 'COL', 'Chile': 'CHL', 'Peru': 'PER',
  'Venezuela': 'VEN', 'Equador': 'ECU', 'Bolívia': 'BOL', 'Paraguai': 'PRY',
  'Uruguai': 'URY', 'Cuba': 'CUB', 'Haiti': 'HTI', 'República Dominicana': 'DOM',
  'Guatemala': 'GTM', 'Honduras': 'HND', 'El Salvador': 'SLV', 'Costa Rica': 'CRI',
  'Panamá': 'PAN', 'Nicarágua': 'NIC',
  'Alemanha': 'DEU', 'França': 'FRA', 'Reino Unido': 'GBR', 'Itália': 'ITA',
  'Espanha': 'ESP', 'Portugal': 'PRT', 'Rússia': 'RUS', 'Ucrânia': 'UKR',
  'Polônia': 'POL', 'Países Baixos': 'NLD', 'Bélgica': 'BEL', 'Suécia': 'SWE',
  'Noruega': 'NOR', 'Finlândia': 'FIN', 'Dinamarca': 'DNK', 'Suíça': 'CHE',
  'Áustria': 'AUT', 'República Tcheca': 'CZE', 'Romênia': 'ROU', 'Hungria': 'HUN',
  'Bulgária': 'BGR', 'Grécia': 'GRC', 'Sérvia': 'SRB', 'Croácia': 'HRV',
  'Eslováquia': 'SVK', 'Irlanda': 'IRL', 'Lituânia': 'LTU', 'Letônia': 'LVA',
  'Estônia': 'EST', 'Bielorrússia': 'BLR', 'Moldávia': 'MDA', 'Albânia': 'ALB',
  'Austrália': 'AUS', 'Nova Zelândia': 'NZL', 'Papua-Nova Guiné': 'PNG',
};

function getIso3(country: string): string {
  return NAME_TO_ISO3[country] || country.substring(0, 3).toUpperCase();
}

export function CapitalsLayer(): null {
  const entitiesRef = useRef<any[]>([]);
  const handlerRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const init = () => {
      const viewer = (window as any).__cesiumViewer;
      const C = (window as any).Cesium;
      if (!viewer || viewer.isDestroyed() || !C) {
        if (!cancelled) retryTimer = setTimeout(init, 600);
        return;
      }

      // Add capital pins in batches of 20 per frame to avoid saturating Cesium
      const countries = complete195Countries;
      let idx = 0;
      const addBatch = () => {
        if (cancelled) return;
        const v = (window as any).__cesiumViewer;
        if (!v || v.isDestroyed()) return;
        const end = Math.min(idx + 20, countries.length);
        for (; idx < end; idx++) {
          const c = countries[idx];
          if (!c.latitude || !c.longitude) continue;
          const entity = v.entities.add({
            position: C.Cartesian3.fromDegrees(c.longitude, c.latitude),
            point: {
              pixelSize: 7,
              color: C.Color.fromCssColorString('#facc15'),
              outlineColor: C.Color.fromCssColorString('#1e3a5f'),
              outlineWidth: 2,
              scaleByDistance: new C.NearFarScalar(500_000, 1.4, 4_000_000, 0.0),
              translucencyByDistance: new C.NearFarScalar(800_000, 1.0, 4_000_000, 0.0),
            },
            label: {
              text: c.capital,
              font: '11px "Google Sans", sans-serif',
              fillColor: C.Color.WHITE,
              outlineColor: C.Color.fromCssColorString('#000814'),
              outlineWidth: 3,
              style: C.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new C.Cartesian2(0, -14),
              scaleByDistance: new C.NearFarScalar(200_000, 1.0, 2_000_000, 0.0),
              translucencyByDistance: new C.NearFarScalar(300_000, 1.0, 2_000_000, 0.0),
            },
            properties: {
              iso3: getIso3(c.country),
              countryName: c.country,
              capital: c.capital,
            },
          });
          entitiesRef.current.push(entity);
        }
        if (idx < countries.length) requestAnimationFrame(addBatch);
      };
      requestAnimationFrame(addBatch);

      // Click handler
      const handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((e: any) => {
        const picked = viewer.scene.pick(e.position);
        if (!C.defined(picked) || !picked.id) return;
        const props = picked.id.properties;
        if (!props) return;
        const iso3 = props.iso3?.getValue?.() ?? props.iso3;
        if (iso3) digitalTwinStore.selectCountry(iso3);
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current = handler;

      // Camera listener: toggle pin visibility based on altitude
      listenerRef.current = viewer.camera.changed.addEventListener(() => {
        const alt = viewer.scene.camera.positionCartographic?.height ?? 999_999_999;
        const show = alt < 5_000_000;
        for (const e of entitiesRef.current) {
          if (e.point) e.point.show = show;
          if (e.label) e.label.show = show;
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      const viewer = (window as any).__cesiumViewer;
      if (viewer && !viewer.isDestroyed()) {
        for (const e of entitiesRef.current) {
          try { viewer.entities.remove(e); } catch {}
        }
        if (listenerRef.current) {
          viewer.camera.changed.removeEventListener(listenerRef.current);
        }
      }
      if (handlerRef.current) {
        try { handlerRef.current.destroy(); } catch {}
      }
      entitiesRef.current = [];
    };
  }, []);

  return null;
}

export default CapitalsLayer;
