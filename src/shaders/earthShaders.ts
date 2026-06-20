export const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
  }
`;

export const dataOverlayVertexShader = `
  attribute float intensity;
  attribute vec3 color;
  varying float vIntensity;
  varying vec3 vColor;
  
  void main() {
    vIntensity = intensity;
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 3.0 + intensity * 5.0;
  }
`;

export const dataOverlayFragmentShader = `
  varying float vIntensity;
  varying vec3 vColor;
  
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = (1.0 - dist * 2.0) * vIntensity;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export const windParticleVertexShader = `
  attribute vec3 velocity;
  attribute float life;
  varying float vLife;
  
  void main() {
    vLife = life;
    vec3 pos = position + velocity * life;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0;
  }
`;

export const windParticleFragmentShader = `
  varying float vLife;
  
  void main() {
    float alpha = 1.0 - vLife;
    gl_FragColor = vec4(0.0, 1.0, 0.8, alpha * 0.6);
  }
`;