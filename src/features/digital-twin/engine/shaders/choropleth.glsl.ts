/**
 * Choropleth Shader — GaiaMind Digital Twin Earth
 * Maps GaiaMind scores to CIELAB-interpolated red/yellow/green fills.
 * Requirements: 4.2, 17.3
 */

export const choroplethVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const choroplethFragmentShader = /* glsl */ `
  // score uniform per country fill mesh (set per draw call)
  uniform float u_score;          // 0–100
  uniform float u_opacity;        // default 0.7
  uniform bool  u_dataAvailable;  // false → grey fill

  // Approx sRGB from CIELAB interpolation endpoints
  // Red  (score=0):   Lab(50, 65, 45)  → ~rgb(0.85, 0.22, 0.13)
  // Yellow (score=30-60 mid): Lab(90, 0, 80) → ~rgb(1.0, 0.93, 0.0)
  // Green (score=100): Lab(55,-60, 45)  → ~rgb(0.06, 0.62, 0.35)
  const vec3 COLOR_RED    = vec3(0.85, 0.22, 0.13);
  const vec3 COLOR_YELLOW = vec3(1.00, 0.93, 0.00);
  const vec3 COLOR_GREEN  = vec3(0.06, 0.62, 0.35);
  const vec3 COLOR_GREY   = vec3(0.62, 0.62, 0.62); // #9E9E9E

  // Accessibility hatch patterns (per Property 41)
  // Note: actual hatch overlay is composited via CSS; shader provides base colour only.

  void main() {
    if (!u_dataAvailable) {
      gl_FragColor = vec4(COLOR_GREY, u_opacity);
      return;
    }

    vec3 color;
    if (u_score <= 30.0) {
      // Red zone: 0–30
      float t = u_score / 30.0;
      color = mix(COLOR_RED, COLOR_YELLOW * 0.5 + COLOR_RED * 0.5, t);
    } else if (u_score <= 60.0) {
      // Yellow zone: 31–60
      float t = (u_score - 30.0) / 30.0;
      color = mix(COLOR_YELLOW * 0.8 + COLOR_RED * 0.2, COLOR_YELLOW, t);
    } else {
      // Green zone: 61–100
      float t = (u_score - 60.0) / 40.0;
      color = mix(COLOR_YELLOW * 0.5 + COLOR_GREEN * 0.5, COLOR_GREEN, t);
    }

    gl_FragColor = vec4(color, u_opacity);
  }
`;

/** Returns the colour zone string for a given score (used in tests / Property 6). */
export function getScoreColourZone(score: number): 'red' | 'yellow' | 'green' {
  if (score <= 30) return 'red';
  if (score <= 60) return 'yellow';
  return 'green';
}

/**
 * Returns the accessibility hatch pattern class for a given score (Property 41).
 * Used when accessibilityMode is true to overlay CSS pattern fills.
 */
export function getAccessibilityPattern(score: number): 'hatch-dense' | 'hatch-medium' | 'hatch-sparse' {
  if (score <= 30) return 'hatch-dense';
  if (score <= 60) return 'hatch-medium';
  return 'hatch-sparse';
}

export const defaultChoroplethUniforms = {
  u_score:         { value: 50.0 },
  u_opacity:       { value: 0.7 },
  u_dataAvailable: { value: true },
};
