/**
 * CloudLayer — GaiaMind Digital Twin Earth
 * Animated cloud texture mesh drifting at 0.02 deg/s.
 * Requirements: 1.7
 */
import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

const GLOBE_RADIUS  = 1;
const CLOUD_RADIUS  = 1.003; // slightly above surface
const DRIFT_RATE    = 0.02 / 360; // fraction of full rotation per second

export function CloudLayer(): React.ReactElement {
  const meshRef    = useRef<THREE.Mesh>(null);
  const uvOffset   = useRef(0);

  const cloudMap = useLoader(TextureLoader, '/textures/earth_clouds_4k.jpg') as THREE.Texture;
  cloudMap.wrapS = THREE.RepeatWrapping;

  const material = React.useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map:         cloudMap,
        transparent: true,
        opacity:     0.4,
        depthWrite:  false,
        blending:    THREE.NormalBlending,
      }),
    [cloudMap]
  );

  useFrame((_, delta) => {
    uvOffset.current += DRIFT_RATE * delta;
    if (cloudMap.offset) {
      cloudMap.offset.x = uvOffset.current;
    }
  });

  return (
    <mesh ref={meshRef} scale={[CLOUD_RADIUS, CLOUD_RADIUS, CLOUD_RADIUS]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default CloudLayer;
