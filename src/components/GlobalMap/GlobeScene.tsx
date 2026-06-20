import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface GlobeSceneProps {
  visualMode: 'wind' | 'temperature' | 'vegetation' | 'political' | 'co2' | 'latin-america';
  onLocationClick: (data: any) => void;
  cities?: { lat: number; lon: number; name?: string }[];
}

export function GlobeScene({ visualMode, onLocationClick, cities = [] }: GlobeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x000011, 1);
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(ambientLight, directionalLight);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
    );

    const geometry = new THREE.SphereGeometry(1.5, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color("grey"),
      shininess: 5,
    });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.52, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x2c87ff,
        transparent: true,
        opacity: 0.15,
      })
    );
    scene.add(atmosphere);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    const windMaterial = new THREE.LineBasicMaterial({ 
      color: visualMode === 'wind' ? 0x00ffcc : 
             visualMode === 'temperature' ? 0xff6b35 : 
             visualMode === 'co2' ? 0xfbbf24 :
             visualMode === 'vegetation' ? 0x22c55e : 0x3b82f6, 
      opacity: 0.5, 
      transparent: true 
    });
    const windGeometry = new THREE.BufferGeometry();
    const windPoints = [];
    for (let i = 0; i < 1000; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.52;
      windPoints.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )
      );
    }
    windGeometry.setFromPoints(windPoints);
    const windLines = new THREE.LineSegments(windGeometry, windMaterial);
    scene.add(windLines);

    const animate = () => {
      requestAnimationFrame(animate);
      earth.rotation.y += 0.0015;
      windLines.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [visualMode]);

  return <div ref={mountRef} className="w-full h-full" />;
}