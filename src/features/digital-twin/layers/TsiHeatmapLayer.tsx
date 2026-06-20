/**
 * TsiHeatmapLayer — GaiaMind Digital Twin Earth
 * Colors countries on the CesiumJS globe based on TSI (Terra Sustainability Index) score.
 * Clicking a country sets selectedIso3 in the store → triggers CountryPanel.
 * Requirements: 4.2, 4.5
 */
import { useEffect, useRef } from 'react';
import { digitalTwinStore, useDigitalTwinStore } from '../store/digitalTwinStore';

// TSI colour scale (matches choropleth shader)
function tsiToRgba(score: number): [number, number, number, number] {
  // Red (low) → Yellow (mid) → Green (high), alpha 0.45
  if (score <= 30) {
    const t = score / 30;
    return [lerp(217, 245, t), lerp(56, 233, t), lerp(32, 0, t), 115];
  }
  if (score <= 60) {
    const t = (score - 30) / 30;
    return [lerp(245, 15, t), lerp(233, 158, t), lerp(0, 89, t), 115];
  }
  const t = (score - 60) / 40;
  return [lerp(15, 0, t), lerp(158, 255, t), lerp(89, 136, t), 115];
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

const GEOJSON_URL = '/api/v1/digital-twin/layers/sustainability';

const AUTH_KEY = 'gaiamind-auth';

function getToken(): string {
  try {
    const s = localStorage.getItem(AUTH_KEY);
    return s ? JSON.parse(s)?.token ?? '' : '';
  } catch { return ''; }
}

export function TsiHeatmapLayer(): null {
  const isActive = useDigitalTwinStore((s) => s.activeLayers.has('sustainability'));
  const dsRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) {
      // Remove datasource if layer disabled
      removeDataSource();
      return;
    }

    // Wait for Cesium viewer to be ready
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const tryLoad = async () => {
      const viewer = (window as any).__cesiumViewer;
      const C = (window as any).Cesium;
      if (!viewer || viewer.isDestroyed() || !C) {
        if (!cancelled) retryTimer = setTimeout(tryLoad, 500);
        return;
      }
      try {
        const token = getToken();
        const res = await fetch(GEOJSON_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const geojson = await res.json();
        if (cancelled) return;

        // Remove old datasource before adding new one
        removeDataSource();

        const ds = await C.GeoJsonDataSource.load(geojson, {
          stroke: C.Color.WHITE.withAlpha(0.3),
          strokeWidth: 0.5,
          fill: C.Color.TRANSPARENT,
          clampToGround: true,
        });

        if (cancelled) { ds.destroy?.(); return; }

        // Colour each entity by TSI score
        for (const entity of ds.entities.values) {
          const props = entity.properties;
          const score = props?.composite_score?.getValue?.() ?? props?.tsi_score?.getValue?.();
          const available = props?.data_available?.getValue?.() !== false;

          let color: any;
          if (!available || score == null) {
            color = C.Color.fromBytes(158, 158, 158, 80); // grey
          } else {
            const [r, g, b, a] = tsiToRgba(score);
            color = C.Color.fromBytes(r, g, b, a);
          }

          if (entity.polygon) {
            entity.polygon.material = color;
            entity.polygon.outline = true;
            entity.polygon.outlineColor = C.Color.WHITE.withAlpha(0.2);
          }
        }

        viewer.dataSources.add(ds);
        dsRef.current = ds;

        // Click handler → select country
        const handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((e: any) => {
          const picked = viewer.scene.pick(e.position);
          if (!C.defined(picked) || !picked.id) return;
          const iso3 = picked.id.properties?.iso3?.getValue?.()
            || picked.id.properties?.ISO_A3?.getValue?.()
            || null;
          if (iso3 && iso3 !== '-99') {
            digitalTwinStore.selectCountry(iso3);
          }
        }, C.ScreenSpaceEventType.LEFT_CLICK);

        // Store handler ref for cleanup
        (dsRef as any)._handler = handler;
      } catch { /* non-critical */ }
    };

    tryLoad();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      removeDataSource();
    };
  }, [isActive]);

  function removeDataSource() {
    const viewer = (window as any).__cesiumViewer;
    if (dsRef.current && viewer && !viewer.isDestroyed()) {
      viewer.dataSources.remove(dsRef.current, true);
    }
    if ((dsRef as any)._handler) {
      (dsRef as any)._handler.destroy();
      (dsRef as any)._handler = null;
    }
    dsRef.current = null;
  }

  return null;
}

export default TsiHeatmapLayer;
