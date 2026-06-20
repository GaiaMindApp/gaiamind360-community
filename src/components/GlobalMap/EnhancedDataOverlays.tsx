import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { weatherService, WeatherData } from '../../services/weatherService';
import { dataOverlayVertexShader, dataOverlayFragmentShader } from '../../shaders/earthShaders';

interface EnhancedDataOverlaysProps {
  visualMode: 'wind' | 'temperature' | 'vegetation' | 'political' | 'co2';
  scene: THREE.Scene;
  layers: {
    temperature: boolean;
    wind: boolean;
    co2: boolean;
    humidity: boolean;
  };
}

export function EnhancedDataOverlays({ visualMode, scene, layers }: EnhancedDataOverlaysProps) {
  const overlaysRef = useRef<THREE.Group>(new THREE.Group());
  const dataRef = useRef<WeatherData[]>([]);

  useEffect(() => {
    scene.add(overlaysRef.current);
    loadWeatherData();

    return () => {
      scene.remove(overlaysRef.current);
    };
  }, [scene]);

  useEffect(() => {
    updateOverlays();
  }, [visualMode, layers]);

  const loadWeatherData = async () => {
    try {
      const climateData = await weatherService.getGlobalWeatherData();
      dataRef.current = climateData[0]?.data || [];
      updateOverlays();
    } catch (error) {
      console.error('Failed to load weather data:', error);
    }
  };

  const updateOverlays = () => {
    overlaysRef.current.clear();

    if (!dataRef.current.length) return;

    if (layers.temperature && (visualMode === 'temperature' || visualMode === 'political')) {
      createTemperatureOverlay();
    }
    
    if (layers.wind && (visualMode === 'wind' || visualMode === 'political')) {
      createWindOverlay();
    }
    
    if (layers.co2 && (visualMode === 'co2' || visualMode === 'political')) {
      createCO2Overlay();
    }
  };

  const createTemperatureOverlay = () => {
    const positions = [];
    const colors = [];
    const intensities = [];

    dataRef.current.forEach(data => {
      const [lon, lat] = data.coordinates;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.51;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      const temp = data.temperature;
      const normalizedTemp = Math.max(0, Math.min(1, (temp + 20) / 60));
      colors.push(
        normalizedTemp,
        0.5 - Math.abs(normalizedTemp - 0.5),
        1 - normalizedTemp
      );
      intensities.push(Math.abs(temp) / 40);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('intensity', new THREE.Float32BufferAttribute(intensities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: dataOverlayVertexShader,
      fragmentShader: dataOverlayFragmentShader,
      transparent: true,
      vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    overlaysRef.current.add(points);
  };

  const createWindOverlay = () => {
    const windGroup = new THREE.Group();

    dataRef.current.forEach(data => {
      if (data.windSpeed < 2) return;

      const [lon, lat] = data.coordinates;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.52;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const windDir = Number(data.windDirection) * (Math.PI / 180);
      const windLength = Number(data.windSpeed) * 0.02;
      
      const geometry = new THREE.BufferGeometry();
      const positions = [
        x, y, z,
        x + Math.cos(windDir) * windLength,
        y,
        z + Math.sin(windDir) * windLength
      ];
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.5, 1, 0.5 + data.windSpeed / 30),
        transparent: true,
        opacity: 0.7
      });

      const line = new THREE.Line(geometry, material);
      windGroup.add(line);
    });

    overlaysRef.current.add(windGroup);
  };

  const createCO2Overlay = () => {
    const positions = [];
    const colors = [];
    const intensities = [];

    dataRef.current.forEach(data => {
      const [lon, lat] = data.coordinates;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.53;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      const co2 = data.co2;
      const normalizedCO2 = Math.max(0, Math.min(1, (co2 - 380) / 60));
      colors.push(
        0.8 + normalizedCO2 * 0.2,
        0.8 - normalizedCO2 * 0.6,
        0.2
      );
      intensities.push(normalizedCO2);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('intensity', new THREE.Float32BufferAttribute(intensities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: dataOverlayVertexShader,
      fragmentShader: dataOverlayFragmentShader,
      transparent: true,
      vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    overlaysRef.current.add(points);
  };

  return null;
}