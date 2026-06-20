import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';

interface City {
  name: string;
  lat: number;
  lon: number;
  population?: number;
  type?: 'capital' | 'major' | 'minor';
  co2Level?: number;
  temperature?: number;
}

interface CityMarkersProps {
  cities: City[];
  scene: THREE.Scene;
  onCityClick: (city: City) => void;
  visible: boolean;
}

export function CityMarkers({ cities, scene, onCityClick, visible }: CityMarkersProps) {
  const markersRef = useRef<THREE.Group>(new THREE.Group());
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    scene.add(markersRef.current);
    createCityMarkers();

    return () => {
      scene.remove(markersRef.current);
    };
  }, [scene, cities]);

  useEffect(() => {
    markersRef.current.visible = visible;
  }, [visible]);

  const createCityMarkers = () => {
    markersRef.current.clear();

    cities.forEach((city, index) => {
      const markerGroup = new THREE.Group();
      
      // Convert lat/lon to 3D coordinates
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lon + 180) * (Math.PI / 180);
      const radius = 1.52;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      // Create marker based on city type
      const markerSize = city.type === 'capital' ? 0.03 : 
                        city.type === 'major' ? 0.02 : 0.015;
      
      const markerColor = city.type === 'capital' ? 0xffd700 : 
                         city.type === 'major' ? 0xff6b35 : 0x60a5fa;

      // Main marker
      const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
      const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: markerColor,
        transparent: true,
        opacity: 0.9
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      marker.userData = { city, index };

      // Pulsing ring effect
      const ringGeometry = new THREE.RingGeometry(markerSize * 1.5, markerSize * 2, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(x, y, z);
      ring.lookAt(0, 0, 0);

      // Data visualization pillar for environmental data
      if (city.co2Level || city.temperature) {
        const pillarHeight = 0.1 + (city.co2Level || 400) / 500 * 0.2;
        const pillarGeometry = new THREE.CylinderGeometry(0.005, 0.005, pillarHeight, 8);
        const pillarColor = city.co2Level > 450 ? 0xff4444 : 
                           city.co2Level > 420 ? 0xffaa44 : 0x44ff44;
        const pillarMaterial = new THREE.MeshBasicMaterial({ 
          color: pillarColor,
          transparent: true,
          opacity: 0.7
        });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        
        // Position pillar above surface
        const pillarRadius = radius + pillarHeight / 2;
        const pillarX = pillarRadius * Math.sin(phi) * Math.cos(theta);
        const pillarY = pillarRadius * Math.cos(phi);
        const pillarZ = pillarRadius * Math.sin(phi) * Math.sin(theta);
        
        pillar.position.set(pillarX, pillarY, pillarZ);
        pillar.lookAt(0, 0, 0);
        markerGroup.add(pillar);
      }

      markerGroup.add(marker, ring);
      markersRef.current.add(markerGroup);

      // Animate ring pulsing
      const animateRing = () => {
        const time = Date.now() * 0.001;
        ring.scale.setScalar(1 + Math.sin(time * 2 + index) * 0.2);
        ringMaterial.opacity = 0.2 + Math.sin(time * 2 + index) * 0.1;
      };

      // Store animation function for cleanup
      (ring as any).animate = animateRing;
    });
  };

  // Animation loop for pulsing effects
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      markersRef.current.children.forEach(markerGroup => {
        const ring = markerGroup.children[1] as THREE.Mesh;
        if (ring && (ring as any).animate) {
          (ring as any).animate();
        }
      });
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return null;
}

// City data with environmental information
export const worldCities: City[] = [
  { name: "New York", lat: 40.7128, lon: -74.0060, type: "major", population: 8400000, co2Level: 445, temperature: 12 },
  { name: "London", lat: 51.5074, lon: -0.1278, type: "major", population: 9000000, co2Level: 420, temperature: 11 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, type: "major", population: 14000000, co2Level: 430, temperature: 16 },
  { name: "Paris", lat: 48.8566, lon: 2.3522, type: "capital", population: 2200000, co2Level: 415, temperature: 12 },
  { name: "Berlin", lat: 52.5200, lon: 13.4050, type: "capital", population: 3700000, co2Level: 410, temperature: 10 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, type: "major", population: 5300000, co2Level: 425, temperature: 18 },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333, type: "major", population: 12300000, co2Level: 460, temperature: 20 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777, type: "major", population: 20400000, co2Level: 470, temperature: 27 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, type: "capital", population: 10200000, co2Level: 440, temperature: 22 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792, type: "major", population: 15300000, co2Level: 450, temperature: 28 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, type: "capital", population: 21500000, co2Level: 480, temperature: 13 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, type: "capital", population: 21800000, co2Level: 465, temperature: 16 },
  { name: "Moscow", lat: 55.7558, lon: 37.6176, type: "capital", population: 12500000, co2Level: 435, temperature: 6 },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784, type: "major", population: 15500000, co2Level: 440, temperature: 14 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, type: "capital", population: 10600000, co2Level: 455, temperature: 28 }
];