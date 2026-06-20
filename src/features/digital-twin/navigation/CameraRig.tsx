/**
 * CameraRig — GaiaMind Digital Twin Earth
 * Camera orbit controls with fly-to, momentum deceleration, and altitude clamping.
 * Requirements: 2.2, 2.3, 2.5, 2.6, 2.11, 14.3
 */
import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clampAltitude, clampLatitude, getTransitionDuration } from './GeoHierarchyLOD';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import type { RotationDelta, ZoomDelta } from '../types/digitalTwin.types';

const KM_PER_WU = 6371;
function kmToWU(km: number): number { return km / KM_PER_WU; }

interface FlyToTarget {
  lat: number; lon: number; altKm: number;
  duration: number; elapsed: number;
  startPos: THREE.Vector3; targetPos: THREE.Vector3;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export interface CameraRigHandle {
  applyRotation: (delta: RotationDelta) => void;
  applyZoom:     (delta: ZoomDelta) => void;
  startMomentum: (velocity: RotationDelta) => void;
  flyTo:         (lat: number, lon: number) => void;
  cancelFlyTo:   () => void;
}

interface Props { rigRef: React.MutableRefObject<CameraRigHandle | null>; }

export function CameraRig({ rigRef }: Props): null {
  const { camera } = useThree();

  const s     = digitalTwinStore.getState();
  const lat   = useRef(s.cameraLat);
  const lon   = useRef(s.cameraLon);
  const altKm = useRef(s.cameraAltitudeKm);

  const momentum = useRef<RotationDelta>({ dLon: 0, dLat: 0 });
  const DECEL    = 0.97;
  const flyTo    = useRef<FlyToTarget | null>(null);

  useEffect(() => {
    rigRef.current = {
      applyRotation: (delta) => {
        flyTo.current = null;
        digitalTwinStore.setIsFlying(false);
        lon.current = ((lon.current + delta.dLon + 180) % 360) - 180;
        lat.current = clampLatitude(lat.current - delta.dLat);
      },
      applyZoom: (delta) => {
        flyTo.current = null;
        digitalTwinStore.setIsFlying(false);
        altKm.current = clampAltitude(altKm.current + delta.dAltitude);
        digitalTwinStore.setAltitude(altKm.current);
      },
      startMomentum: (velocity) => { momentum.current = { ...velocity }; },
      flyTo: (targetLat, targetLon) => {
        const startPos  = computeCartesian(lat.current, lon.current, altKm.current);
        const endAlt    = 5000;
        const targetPos = computeCartesian(targetLat, targetLon, endAlt);
        const dLat = Math.abs(targetLat - lat.current);
        const dLon = Math.abs(targetLon - lon.current);
        flyTo.current = {
          lat: targetLat, lon: targetLon, altKm: endAlt,
          duration: getTransitionDuration(Math.min(Math.sqrt(dLat*dLat + dLon*dLon), 180)),
          elapsed: 0, startPos, targetPos,
        };
        digitalTwinStore.setIsFlying(true);
        momentum.current = { dLon: 0, dLat: 0 };
      },
      cancelFlyTo: () => { flyTo.current = null; digitalTwinStore.setIsFlying(false); },
    };
  }, [rigRef]);

  useFrame((_, delta) => {
    if (flyTo.current) {
      flyTo.current.elapsed += delta;
      const t = Math.min(flyTo.current.elapsed / flyTo.current.duration, 1);
      camera.position.lerpVectors(flyTo.current.startPos, flyTo.current.targetPos, easeInOut(t));
      camera.lookAt(0, 0, 0);
      if (t >= 1) {
        lat.current   = flyTo.current.lat;
        lon.current   = flyTo.current.lon;
        altKm.current = flyTo.current.altKm;
        flyTo.current = null;
        digitalTwinStore.setIsFlying(false);
      }
      return;
    }

    if (Math.abs(momentum.current.dLon) > 0.01 || Math.abs(momentum.current.dLat) > 0.01) {
      lon.current = ((lon.current + momentum.current.dLon + 180) % 360) - 180;
      lat.current = clampLatitude(lat.current - momentum.current.dLat);
      momentum.current.dLon *= DECEL;
      momentum.current.dLat *= DECEL;
      if (Math.abs(momentum.current.dLon) < 0.01) momentum.current.dLon = 0;
      if (Math.abs(momentum.current.dLat) < 0.01) momentum.current.dLat = 0;
    }

    const pos = computeCartesian(lat.current, lon.current, altKm.current);
    camera.position.copy(pos);
    camera.lookAt(0, 0, 0);
    digitalTwinStore.setAltitude(altKm.current);
  });

  return null;
}

function computeCartesian(latDeg: number, lonDeg: number, altKm: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r   = 1 + kmToWU(altKm);
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon)
  );
}

export default CameraRig;
