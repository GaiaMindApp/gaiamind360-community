/**
 * StarField — GaiaMind Digital Twin Earth
 * 10,000 particle stars at distance 1000x globe radius.
 * Requirements: 14.4
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

const STAR_COUNT    = 10_000;
const STAR_DISTANCE = 1000;

export function StarField(): React.ReactElement {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Random point on a sphere of radius STAR_DISTANCE
      const theta = Math.random() * 2 * Math.PI;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = STAR_DISTANCE * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = STAR_DISTANCE * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = STAR_DISTANCE * Math.cos(phi);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.5}
        color="#ffffff"
        sizeAttenuation={false}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

export default StarField;
