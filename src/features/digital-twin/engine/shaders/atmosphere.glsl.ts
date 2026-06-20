/**
 * Atmosphere Glow Shader — GaiaMind Digital Twin Earth
 * Renders a volumetric limb glow around the Earth.
 * Requirements: 1.2, 14.1
 */

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 u_atmosphereColor;   // default: vec3(0.3, 0.6, 1.0) blue tint
  uniform float u_intensity;         // default: 1.5
  uniform vec3 u_sunDirection;       // normalised direction toward the sun

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal  = normalize(vNormal);

    // Rim / limb glow — stronger toward the edge (dot → 0)
    float rim = 1.0 - abs(dot(normal, viewDir));
    rim = pow(rim, 3.0) * u_intensity;

    // Slightly brighter on the sunlit side (Property 29: monotonic glow)
    float sunDot = max(0.0, dot(normal, u_sunDirection));
    float glow   = rim * (0.6 + 0.4 * sunDot);

    gl_FragColor = vec4(u_atmosphereColor * glow, glow * 0.7);
  }
`;

/** Default uniforms for AtmosphereGlow */
export const defaultAtmosphereUniforms = {
  u_atmosphereColor: { value: [0.3, 0.6, 1.0] },
  u_intensity:       { value: 1.5 },
  u_sunDirection:    { value: [1.0, 0.0, 0.0] },
};
