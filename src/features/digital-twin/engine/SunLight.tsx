/**
 * SunLight — GaiaMind Digital Twin Earth
 * Directional light repositioned ≥ once/s to track the real-time solar position.
 * Requirements: 1.3
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSolarPosition } from '../hooks/useSolarPosition';

const SUN_DISTANCE = 10; // world units (far enough to be directional)

export function SunLight(): React.ReactElement {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { sunLongitude, sunLatitude } = useSolarPosition();

  useFrame(() => {
    if (!lightRef.current) return;
    const lonRad = (sunLongitude * Math.PI) / 180;
    const latRad = (sunLatitude  * Math.PI) / 180;
    lightRef.current.position.set(
      SUN_DISTANCE * Math.cos(latRad) * Math.cos(lonRad),
      SUN_DISTANCE * Math.sin(latRad),
      SUN_DISTANCE * Math.cos(latRad) * Math.sin(lonRad)
    );
  });

  return (
    <>
      {/* Ambient light for dark-side visibility */}
      <ambientLight intensity={0.05} />
      {/* Primary directional sun light */}
      <directionalLight
        ref={lightRef}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
}

export default SunLight;
