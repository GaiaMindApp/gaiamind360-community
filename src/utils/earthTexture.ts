import * as THREE from 'three';

export function createEarthTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Criar gradiente base da Terra
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1e3a8a'); // Azul oceano
  gradient.addColorStop(0.3, '#2563eb');
  gradient.addColorStop(0.7, '#059669'); // Verde continentes
  gradient.addColorStop(1, '#1e3a8a');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  // Adicionar continentes simplificados
  ctx.fillStyle = '#065f46';
  
  // América do Norte
  ctx.fillRect(80, 60, 60, 40);
  ctx.fillRect(90, 50, 40, 20);
  
  // América do Sul
  ctx.fillRect(100, 120, 30, 60);
  
  // Europa
  ctx.fillRect(240, 70, 40, 30);
  
  // África
  ctx.fillRect(250, 100, 35, 80);
  
  // Ásia
  ctx.fillRect(300, 50, 80, 60);
  
  // Austrália
  ctx.fillRect(380, 150, 30, 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  return texture;
}