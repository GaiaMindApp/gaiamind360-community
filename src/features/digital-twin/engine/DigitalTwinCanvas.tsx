/**
 * DigitalTwinCanvas — GaiaMind Digital Twin Earth
 * CesiumJS via CDN with confirmed Ion assets:
 *   Asset 1  — Cesium World Terrain  (COMPLETE ✓)
 *   Asset 2  — Bing Maps Aerial      (COMPLETE ✓)
 * Token: VITE_CESIUM_ION_TOKEN
 */
import React, { useEffect, useRef, useState } from 'react';
import { digitalTwinStore } from '../store/digitalTwinStore';

const CESIUM_VERSION = '1.123';
const CESIUM_CDN     = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

let cesiumLoaded = false;

async function loadCesium(): Promise<any> {
  if ((window as any).Cesium) return (window as any).Cesium;
  if (cesiumLoaded) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if ((window as any).Cesium) { clearInterval(check); resolve((window as any).Cesium); }
      }, 100);
    });
  }
  cesiumLoaded = true;

  const link = document.createElement('link');
  link.rel   = 'stylesheet';
  link.href  = `${CESIUM_CDN}/Widgets/widgets.css`;
  document.head.appendChild(link);

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src     = `${CESIUM_CDN}/Cesium.js`;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Cesium CDN load failed'));
    document.head.appendChild(script);
  });

  const C = (window as any).Cesium;
  C.Ion.defaultAccessToken  = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
  (window as any).CESIUM_BASE_URL = `${CESIUM_CDN}/`;
  return C;
}

export function DigitalTwinCanvas(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef    = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let destroyed  = false;
    let idleTimer: ReturnType<typeof setTimeout>;

    loadCesium()
      .then(async (Cesium) => {
        if (destroyed || !containerRef.current) return;

        // Asset 1 — Cesium World Terrain (fallback to ellipsoid if Ion is unavailable)
        let terrain;
        try {
          terrain = await Cesium.Terrain.fromWorldTerrain({
            requestWaterMask: false,
            requestVertexNormals: false,
          });
        } catch {
          terrain = new Cesium.Terrain(new Cesium.EllipsoidTerrainProvider());
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
          terrain,
          baseLayerPicker:       false,   // disabled — only confirmed assets loaded manually
          geocoder:              true,
          homeButton:            true,
          sceneModePicker:       true,
          navigationHelpButton:  false,
          animation:             false,
          timeline:              false,
          fullscreenButton:      false,
          infoBox:               true,
          selectionIndicator:    true,
          shouldAnimate:         true,
        });

        // Bing Maps Aerial base layer
        viewer.imageryLayers.removeAll();
        const bingLayer = await Cesium.IonImageryProvider.fromAssetId(2);
        viewer.imageryLayers.addImageryProvider(bingLayer);

        // OSM as overlay — contains borders, provinces, cities, rivers, roads
        // Fades in below 2000km so it doesn't obscure the globe from space
        const osmLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c'],
            credit: '\u00a9 OpenStreetMap contributors',
            maximumLevel: 19,
          })
        );
        osmLayer.alpha = 0.0;

        // OSM Buildings 3D (asset 96188)
        try {
          const osmBuildings = await Cesium.createOsmBuildingsAsync();
          viewer.scene.primitives.add(osmBuildings);
        } catch { /* non-critical */ }

        // Recover from Cesium internal render errors (e.g. RangeError in createPotentiallyVisibleSet)
        viewer.scene.renderError.addEventListener((_scene: any, error: any) => {
          console.warn('[DigitalTwin] Cesium renderError — restarting renderer:', error?.message ?? error);
          try {
            // Resume rendering after a brief pause; Cesium resets its internal state
            viewer.useDefaultRenderLoop = false;
            setTimeout(() => {
              if (!viewer.isDestroyed()) {
                viewer.useDefaultRenderLoop = true;
              }
            }, 500);
          } catch { /* viewer already destroyed */ }
        });

        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50_000_000;
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';
        viewerRef.current = viewer;
        (window as any).__cesiumViewer = viewer;

        // Fade OSM overlay in when zoomed in — shows borders/cities/provinces
        const updateOsmAlpha = () => {
          try {
            const carto = viewer.scene.camera.positionCartographic;
            if (!carto) return;
            const alt = carto.height;
            osmLayer.alpha = alt < 300_000 ? 0.75
              : alt < 2_000_000 ? 0.75 * (1 - (alt - 300_000) / 1_700_000)
              : 0.0;
          } catch { /* scene not ready yet */ }
        };
        viewer.camera.changed.addEventListener(updateOsmAlpha);
        updateOsmAlpha();

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(0, 15, 12_000_000),
          duration: 1.5,
        });

        // Gentle auto-rotation via scene postRender (doesn't block Cesium input)
        let autoRotate = true;
        const onPreRender = () => {
          if (autoRotate) viewer.scene.camera.rotateRight(0.00035);
        };
        viewer.scene.preRender.addEventListener(onPreRender);

        // Stop rotation on any camera interaction
        const screenHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        screenHandler.setInputAction(() => {
          autoRotate = false;
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => { autoRotate = true; }, 8000);
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        screenHandler.setInputAction(() => {
          autoRotate = false;
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => { autoRotate = true; }, 8000);
        }, Cesium.ScreenSpaceEventType.WHEEL);

        // ── Scroll zoom centred on cursor (like Leaflet 2D) ──────────────────
        // Override default wheel behaviour: zoom toward the point under the mouse
        viewer.scene.canvas.addEventListener('wheel', (e: WheelEvent) => {
          e.stopPropagation(); // prevent Cesium default wheel handler
          const viewer = (window as any).__cesiumViewer;
          if (!viewer || viewer.isDestroyed()) return;

          const C = (window as any).Cesium;
          const scene = viewer.scene;
          const camera = scene.camera;

          // Pick the 3D position under the cursor
          const rect = scene.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const windowPos = new C.Cartesian2(x, y);
          const pickedPos = scene.pickPosition(windowPos)
            || camera.pickEllipsoid(windowPos, scene.globe.ellipsoid);

          if (!pickedPos) return;

          // Current distance from camera to picked point
          const dist = C.Cartesian3.distance(camera.position, pickedPos);
          // Zoom factor: negative delta = zoom in
          const factor = e.deltaY > 0 ? 0.15 : -0.15;
          const zoomAmount = dist * factor;

          // Move camera toward/away from picked point
          const direction = C.Cartesian3.subtract(pickedPos, camera.position, new C.Cartesian3());
          C.Cartesian3.normalize(direction, direction);
          C.Cartesian3.multiplyByScalar(direction, zoomAmount, direction);

          const newPos = C.Cartesian3.add(camera.position, direction, new C.Cartesian3());
          // Clamp to min altitude
          try {
            const carto = C.Cartographic.fromCartesian(newPos);
            if (!carto || carto.height < 50) return;
            camera.position = newPos;
          } catch { /* invalid position — skip */ }
        }, { passive: false });
        // ────────────────────────────────────────────────────────────────────

        const unsubscribe = digitalTwinStore.subscribe(() => {});

        // Double-click: zoom in centred on clicked point (like Leaflet)
        const dblClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        dblClickHandler.setInputAction((e: any) => {
          autoRotate = false;
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => { autoRotate = true; }, 8000);

          const picked = viewer.scene.pickPosition(e.position)
            || viewer.scene.camera.pickEllipsoid(e.position, viewer.scene.globe.ellipsoid);
          if (!picked) return;

          const currentAlt = viewer.scene.camera.positionCartographic.height;
          const targetAlt  = Math.max(currentAlt * 0.35, 500); // zoom to 35%, min 500m
          const carto = Cesium.Cartographic.fromCartesian(picked);

          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromRadians(
              carto.longitude, carto.latitude, targetAlt
            ),
            duration: 0.8, // fast like Leaflet double-click
          });
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        if (!destroyed) setStatus('ready');

        return () => {
          clearTimeout(idleTimer);
          unsubscribe();
          viewer.camera.changed.removeEventListener(updateOsmAlpha);
          viewer.scene.preRender.removeEventListener(onPreRender);
          screenHandler.destroy();
          dblClickHandler.destroy();
          if (!viewer.isDestroyed()) viewer.destroy();
        };
      })
      .catch(e => {
        if (!destroyed) { setErrMsg(String(e)); setStatus('error'); }
      });

    return () => {
      destroyed = true;
      clearTimeout(idleTimer!);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000814' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#000814',
          color: 'rgba(255,255,255,0.6)', fontSize: 13, gap: 12, pointerEvents: 'none',
        }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid rgba(255,255,255,0.12)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'dte-spin 0.9s linear infinite',
          }} />
          A carregar Digital Twin Earth…
          <style>{`@keyframes dte-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#000814',
          color: '#ef4444', fontSize: 12, gap: 8, padding: 24, textAlign: 'center',
        }}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <strong>Erro ao carregar o Digital Twin</strong>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{errMsg}</span>
        </div>
      )}
    </div>
  );
}

export default DigitalTwinCanvas;
