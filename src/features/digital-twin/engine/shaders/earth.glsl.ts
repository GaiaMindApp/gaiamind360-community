/**
 * Earth PBR Shader — GaiaMind Digital Twin Earth
 * Handles: satellite texture, specular ocean, displacement, ice caps, day/night.
 * Requirements: 1.1, 1.4, 1.5, 1.8, 1.9
 */

export const earthVertexShader = /* glsl */ `
  uniform sampler2D u_displacementMap;
  uniform float     u_displacementScale; // default 0.02 (2% of globe radius)

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Displacement along surface normal
    float disp = texture2D(u_displacementMap, uv).r;
    vec3 displaced = position + normal * disp * u_displacementScale;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const earthFragmentShader = /* glsl */ `
  uniform sampler2D u_map;          // 8K satellite texture
  uniform sampler2D u_specularMap;  // ocean mask (white = ocean)
  uniform sampler2D u_nightMap;     // city lights for night side
  uniform vec3      u_sunDirection; // normalised direction toward sun
  uniform float     u_iceCapLatitude; // default 60.0 degrees
  uniform float     u_iceCapOpacity;  // default 0.72 (>= 0.7 per Req 1.8)
  uniform float     u_cloudUvOffset; // drifts at 0.02 deg/s driven by CPU

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // Convert UV to approximate latitude in degrees
  float uvToLat(float v) {
    return (0.5 - v) * 180.0;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(u_sunDirection);

    // Base satellite colour
    vec4 dayColor = texture2D(u_map, vUv);

    // Day/night terminator
    float sunDot = dot(normal, sunDir);
    float dayNight = smoothstep(-0.1, 0.1, sunDot);

    // Night lights on dark side
    vec4 nightColor = texture2D(u_nightMap, vUv);
    vec4 baseColor = mix(nightColor * 0.6, dayColor, dayNight);

    // Specular ocean reflection (ocean = bright in specularMap)
    float oceanMask = texture2D(u_specularMap, vUv).r;
    vec3 viewDir    = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir    = normalize(sunDir + viewDir);
    float specular  = pow(max(dot(normal, halfDir), 0.0), 64.0) * oceanMask * dayNight;

    // Ice caps: blend white at high latitudes
    float lat = abs(uvToLat(vUv.y));
    float iceBlend = smoothstep(u_iceCapLatitude - 3.0, u_iceCapLatitude + 3.0, lat);
    vec4 iceColor  = vec4(1.0, 1.0, 1.0, 1.0);
    vec4 finalColor = mix(baseColor, iceColor, iceBlend * u_iceCapOpacity);

    // Add specular highlight on top
    finalColor.rgb += vec3(specular * 0.8);

    gl_FragColor = finalColor;
  }
`;

export const defaultEarthUniforms = {
  u_displacementScale: { value: 0.02 },
  u_sunDirection:      { value: [1.0, 0.0, 0.0] },
  u_iceCapLatitude:    { value: 60.0 },
  u_iceCapOpacity:     { value: 0.72 },
  u_cloudUvOffset:     { value: 0.0 },
};
