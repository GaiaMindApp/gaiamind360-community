/**
 * EarthGlobe — GaiaMind Digital Twin Earth
 * R3F sphere with PBR shaders, 8K textures, ice caps, displacement, axial tilt.
 * Requirements: 1.1–1.9
 */
import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

import { earthVertexShader, earthFragmentShader, defaultEarthUniforms } from './shaders/earth.glsl';
import { useSolarPosition } from '../hooks/useSolarPosition';
import { useDigitalTwinStore } from '../store/digitalTwinStore';

// Globe geometry constants
const GLOBE_RADIUS       = 1;        // world units
const GLOBE_SEGMENTS     = 128;      // sphere subdivisions
const AXIAL_TILT_DEG     = 23.5;     // Req 1.9
const CLOUD_DRIFT_RATE   = 0.02 / 360; // degrees/s → UV fraction per second
const AUTO_ROTATE_RATE   = 0.3 / 360;  // degrees/s → fraction per second

export interface EarthGlobeProps {
  /** Override texture paths (useful for tests / low-perf mode) */
  mapUrl?:         string;
  displacementUrl?: string;
  specularUrl?:    string;
  nightUrl?:       string;
}

export function EarthGlobe({
  mapUrl         = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r134/examples/textures/planets/earth_atmos_2048.jpg',
  displacementUrl = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r134/examples/textures/planets/earth_atmos_2048.jpg',
  specularUrl    = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r134/examples/textures/planets/earth_specular_2048.jpg',
  nightUrl       = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r134/examples/textures/planets/earth_lights_2048.png',
}: EarthGlobeProps): React.ReactElement {
  const globeGroupRef = useRef<THREE.Group>(null);
  const meshRef       = useRef<THREE.Mesh>(null);
  const cloudUvOffset = useRef(0);

  const autoRotating = useDigitalTwinStore((s) => s.autoRotating);
  const { sunLongitude, sunLatitude } = useSolarPosition();

  // Load textures (THREE TextureLoader)
  const [map, displacementMap, specularMap, nightMap] = useLoader(TextureLoader, [
    mapUrl, displacementUrl, specularUrl, nightUrl,
  ]) as THREE.Texture[];

  // Build shader material via useMemo — always defined, never null
  const shaderMaterial = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...defaultEarthUniforms,
          u_map:             { value: map },
          u_displacementMap: { value: displacementMap },
          u_specularMap:     { value: specularMap },
          u_nightMap:        { value: nightMap },
          u_sunDirection:    { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader:   earthVertexShader,
        fragmentShader: earthFragmentShader,
      }),
    [map, displacementMap, specularMap, nightMap]
  );

  useFrame((_, delta) => {
    if (!globeGroupRef.current) return;

    // Update sun direction uniform from solar position
    const lonRad = (sunLongitude * Math.PI) / 180;
    const latRad = (sunLatitude  * Math.PI) / 180;
    shaderMaterial.uniforms.u_sunDirection.value.set(
      Math.cos(latRad) * Math.cos(lonRad),
      Math.sin(latRad),
      Math.cos(latRad) * Math.sin(lonRad)
    );

    // Drift cloud UV offset
    cloudUvOffset.current += CLOUD_DRIFT_RATE * delta;
    shaderMaterial.uniforms.u_cloudUvOffset.value = cloudUvOffset.current;

    // Auto-rotation
    if (autoRotating) {
      globeGroupRef.current.rotation.y += AUTO_ROTATE_RATE * delta * (2 * Math.PI);
    }
  });

  return (
    // Axial tilt applied to the whole group (Req 1.9)
    <group ref={globeGroupRef} rotation={[0, 0, (AXIAL_TILT_DEG * Math.PI) / 180]}>
      <mesh ref={meshRef} receiveShadow castShadow>
        <sphereGeometry args={[GLOBE_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </group>
  );
}

export default EarthGlobe;
