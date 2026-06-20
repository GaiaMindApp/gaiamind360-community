import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "../../utils/geo";

type CityPoint = {
  lat: number;
  lon: number;
};

export default function WindParticles({
  points = [] as CityPoint[],
  particleCount = 3000,
}: {
  points?: CityPoint[];
  particleCount?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  const particles = useMemo(() => {
    const arr: { pos: THREE.Vector3; speed: number; dir: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      const useCity = points.length > 0 && Math.random() < 0.3;
      let lat = (Math.random() * 180 - 90);
      let lon = (Math.random() * 360 - 180);
      if (useCity) {
        const c = points[Math.floor(Math.random() * points.length)];
        lat = parseFloat(String(c.lat)) + (Math.random() - 0.5) * 1.0;
        lon = parseFloat(String(c.lon)) + (Math.random() - 0.5) * 1.0;
      }
      const pos = latLonToVector3(lat, lon, 2.05);
      arr.push({ pos, speed: 0.0005 + Math.random() * 0.002, dir: Math.random() > 0.5 ? 1 : -1 });
    }
    return arr;
  }, [particleCount, points]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const axis = new THREE.Vector3(0, 1, 0);
      const angle = p.speed * p.dir * (delta * 60);
      p.pos.applyAxisAngle(axis, angle);

      dummy.position.copy(p.pos);
      dummy.lookAt(new THREE.Vector3(0, 0, 0));
      dummy.scale.setScalar(0.003 + Math.abs(Math.sin(state.clock.elapsedTime * 2 + i)) * 0.002);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, particles.length]}>
      <sphereGeometry args={[0.005, 6, 6]} />
      <meshBasicMaterial color="#7efc6e" />
    </instancedMesh>
  );
}