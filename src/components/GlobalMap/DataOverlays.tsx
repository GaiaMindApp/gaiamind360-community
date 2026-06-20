import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DataOverlaysProps {
  mode: 'wind' | 'temperature' | 'vegetation' | 'political';
  visible: boolean;
}

export function DataOverlays({ mode, visible }: DataOverlaysProps) {
  const overlayRef = useRef<THREE.Mesh>(null!);
  
  const overlayTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    switch (mode) {
      case 'temperature':
        // Gradiente de temperatura
        const tempGradient = ctx.createLinearGradient(0, 0, 512, 0);
        tempGradient.addColorStop(0, 'rgba(0, 0, 255, 0.3)'); // Frio
        tempGradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.3)'); // Médio
        tempGradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)'); // Quente
        ctx.fillStyle = tempGradient;
        ctx.fillRect(0, 0, 512, 256);
        break;
        
      case 'vegetation':
        // Índice de vegetação
        ctx.fillStyle = 'rgba(34, 139, 34, 0.4)';
        ctx.fillRect(0, 0, 512, 256);
        // Adicionar variações
        for (let i = 0; i < 100; i++) {
          ctx.fillStyle = `rgba(0, ${100 + Math.random() * 155}, 0, ${0.2 + Math.random() * 0.3})`;
          ctx.fillRect(Math.random() * 512, Math.random() * 256, 20, 20);
        }
        break;
        
      case 'wind':
        // Padrões de vento (transparente para mostrar partículas)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, 512, 256);
        break;
        
      default:
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 512, 256);
    }
    
    return new THREE.CanvasTexture(canvas);
  }, [mode]);

  useFrame((state) => {
    if (overlayRef.current && mode === 'wind') {
      overlayRef.current.rotation.y += 0.001;
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={overlayRef}>
      <sphereGeometry args={[2.002, 64, 64]} />
      <meshBasicMaterial 
        map={overlayTexture}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}