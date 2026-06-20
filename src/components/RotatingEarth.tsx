import { useEffect, useRef } from 'react';

function makeEarthCanvas(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0,   '#0a1628');
  ocean.addColorStop(0.3, '#0d2b52');
  ocean.addColorStop(0.7, '#0d2b52');
  ocean.addColorStop(1,   '#0a1628');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(100,160,255,0.08)';
  ctx.lineWidth = 0.5;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  const land = (lon: number, lat: number, w: number, h: number) => {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    const pw = (w / 360) * W;
    const ph = (h / 180) * H;
    ctx.fillRect(x, y, pw, ph);
  };

  ctx.fillStyle = '#1a5c3a';
  land(-130, 70, 55, 20); land(-125, 50, 50, 30); land(-120, 25, 40, 28); land(-100, 15, 25, 15);
  ctx.fillStyle = '#2a7a50'; land(-50, 80, 25, 15);
  ctx.fillStyle = '#1a5c3a';
  land(-80, 10, 30, 15); land(-75, -5, 28, 50); land(-65, -50, 18, 15);
  land(-10, 70, 25, 12); land(-5, 58, 30, 18); land(10, 46, 18, 12); land(15, 38, 15, 12); land(25, 42, 20, 16);
  land(-18, 38, 35, 12); land(-20, 5, 60, 40); land(28, -25, 18, 20);
  land(35, 35, 25, 18); land(42, 15, 22, 20);
  land(60, 65, 80, 20); land(55, 45, 95, 25); land(70, 25, 70, 25);
  land(100, 10, 40, 20); land(120, 35, 30, 25); land(130, 30, 15, 20); land(100, 55, 50, 15);
  land(95, 5, 30, 15); land(108, 0, 20, 12);
  land(115, -15, 50, 35); land(170, -40, 18, 15);
  ctx.fillStyle = '#c8dae8'; land(-180, -65, 360, 25);
  ctx.fillStyle = '#daeaf5'; land(-180, 85, 360, 8);

  ctx.fillStyle = 'rgba(100,180,255,0.04)';
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 20 + Math.random() * 60, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function RotatingEarth() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let animId: number;
    let destroyed = false;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (destroyed || !mountRef.current) return;

      // Tamanho: ler o lado mais pequeno do container CSS (garante quadrado)
      const size = () => {
        const e = mountRef.current;
        if (!e) return 200;
        const s = Math.min(e.clientWidth, e.clientHeight);
        return Math.max(s || 200, 80);
      };

      const S = size();
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(S, S);
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.z = 2.5;

      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const sun = new THREE.DirectionalLight(0xfff8e8, 1.5);
      sun.position.set(4, 2, 4);
      scene.add(sun);

      const canvasTex = new THREE.CanvasTexture(makeEarthCanvas());
      const geo = new THREE.SphereGeometry(1, 64, 64);
      const mat = new THREE.MeshPhongMaterial({
        map: canvasTex,
        specular: new THREE.Color(0x0d2040),
        shininess: 18,
      });
      scene.add(new THREE.Mesh(geo, mat));

      // Tentar carregar textura fotográfica real
      const tl = new THREE.TextureLoader();
      tl.crossOrigin = 'anonymous';
      const urls = [
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1024px-Equirectangular_projection_SW.jpg',
      ];
      (function tryNext(i: number) {
        if (i >= urls.length) return;
        tl.load(urls[i], (tex) => { mat.map = tex; mat.needsUpdate = true; canvasTex.dispose(); }, undefined, () => tryNext(i + 1));
      })(0);

      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.018, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x3399ff, transparent: true, opacity: 0.07, side: THREE.FrontSide })
      ));

      const starPts = new Float32Array(900);
      for (let i = 0; i < 900; i++) starPts[i] = (Math.random() - 0.5) * 60;
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(starPts, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.4 })));

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false; controls.enablePan = false;
      controls.enableDamping = true; controls.dampingFactor = 0.06;
      controls.rotateSpeed = 0.3; controls.autoRotate = true; controls.autoRotateSpeed = 0.9;

      // ResizeObserver — mais fiável que window resize para containers CSS com clamp()
      const ro = new ResizeObserver(() => {
        if (!mountRef.current) return;
        const s = size();
        renderer.setSize(s, s);
      });
      ro.observe(el);

      const tick = () => {
        animId = requestAnimationFrame(tick);
        controls.update();
        renderer.render(scene, camera);
      };
      tick();

      (mountRef as any)._cleanup = () => {
        ro.disconnect();
        cancelAnimationFrame(animId);
        controls.dispose(); renderer.dispose(); geo.dispose(); mat.dispose();
        try { mountRef.current?.removeChild(renderer.domElement); } catch {}
      };
    }).catch(() => {});

    return () => {
      destroyed = true;
      (mountRef as any)._cleanup?.();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: 'clamp(120px, 30vw, 260px)',
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'grab',
      }}
    />
  );
}
