/**
 * AtmosphereGlow — GaiaMind Digital Twin Earth
 * Volumetric atmosphere shell extending ≥ 5% beyond the globe radius.
 * Requirements: 1.2, 14.1 (Property 29)
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { atmosphereVertexShader, atmosphereFragmentShader, defaultAtmosphereUniforms } from './shaders/atmosphere.glsl';
import { useSolarPosition } from '../hooks/useSolarPosition';

const GLOBE_RADIUS       = 1;
const ATMOSPHERE_SCALE   = 1.06; // 6% beyond surface — > 5% per Req 1.2

export function AtmosphereGlow(): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const { sunLongitude, sunLatitude } = useSolarPosition();

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...defaultAtmosphereUniforms,
          u_sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader:   atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        side:           THREE.BackSide,
        transparent:    true,
        depthWrite:     false,
        blending:       THREE.AdditiveBlending,
      }),
    []
  );

  useFrame(() => {
    const lonRad = (sunLongitude * Math.PI) / 180;
    const latRad = (sunLatitude  * Math.PI) / 180;
    shaderMaterial.uniforms.u_sunDirection.value.set(
      Math.cos(latRad) * Math.cos(lonRad),
      Math.sin(latRad),
      Math.cos(latRad) * Math.sin(lonRad)
    );
  });

  return (
    <mesh ref={meshRef} scale={[ATMOSPHERE_SCALE, ATMOSPHERE_SCALE, ATMOSPHERE_SCALE]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}

export default AtmosphereGlow;
