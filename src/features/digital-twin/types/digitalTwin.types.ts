/**
 * GaiaMind Digital Twin Earth — Domain Types
 *
 * All TypeScript interfaces and type aliases for the Digital Twin Earth feature.
 * These types are shared across the store, engine, layers, panels, hooks, and services.
 *
 * Requirements: 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16
 */

// ---------------------------------------------------------------------------
// Enumerations and union types
// ---------------------------------------------------------------------------

/**
 * The six visibility layers that can be toggled on the globe.
 * Requirement 4 (Sustainability), 5 (TimeMachine), 7 (Risk), 8 (Flows),
 * 12 (AI Copilot actions), 13 (Real-Time Monitor)
 */
export type LayerType =
  | 'sustainability'
  | 'risk'
  | 'flows'
  | 'realtime'
  | 'borders'
  | 'labels';

/**
 * The six global flow categories rendered by the Flow Engine.
 * Requirement 8.1 and 8.5
 */
export type FlowType =
  | 'migration'
  | 'trade'
  | 'carbon'
  | 'energy'
  | 'internet'
  | 'financial';

/**
 * The seven risk dimensions supported by the Risk Observatory.
 * Requirement 7.1
 */
export type RiskDimension =
  | 'climate_risk'
  | 'water_stress'
  | 'food_insecurity'
  | 'political_instability'
  | 'economic_vulnerability'
  | 'biodiversity_loss'
  | 'deforestation_risk';

/**
 * Four-level geographic hierarchy driven by camera altitude.
 * Requirement 2.7, 2.8, 2.9 and 3.x
 */
export type GeoLevel = 'planet' | 'country' | 'state' | 'city';

/**
 * The key name of a single sustainability sub-score,
 * or 'composite' for the weighted aggregate.
 * Requirement 4.1, 4.4
 */
export type SubScoreKey =
  | 'environmental'
  | 'social'
  | 'economic'
  | 'governance'
  | 'climate_resilience'
  | 'digital_development';

/**
 * Forecast scenario variants. Requirement 6.7
 */
export type ForecastScenario = 'Baseline' | 'Optimistic' | 'Pessimistic';

/**
 * Forecast horizon years. Requirement 6.2
 */
export type ForecastHorizonYear = 2030 | 2040 | 2050;

/**
 * Playback speed multiplier for Time Machine animated playback.
 * Requirement 5.4
 */
export type PlaybackSpeed = 1 | 2 | 5 | 10;

// ---------------------------------------------------------------------------
// Sub-score objects
// ---------------------------------------------------------------------------

/**
 * The six sustainability sub-scores that contribute to the composite GaiaMind_Score.
 * Each value is in the range [0, 100].
 * Requirement 4.1
 */
export interface SubScores {
  environmental: number;
  social: number;
  economic: number;
  governance: number;
  climate_resilience: number;
  digital_development: number;
}

// ---------------------------------------------------------------------------
// GaiaMind Score
// ---------------------------------------------------------------------------

/**
 * Full GaiaMind sustainability score record for a single country.
 * Requirement 4.1, 4.6, 16.1
 */
export interface GaiaMindScore {
  /** ISO 3166-1 alpha-3 country code (canonical country identifier) */
  iso3: string;
  /** Composite weighted score in [0, 100] */
  composite_score: number;
  /** Breakdown of the six sub-scores, each in [0, 100] */
  sub_scores: SubScores;
  /** False when data is unavailable; country shows neutral grey (#9E9E9E) */
  data_available: boolean;
  /** ISO 8601 timestamp of when this score was last computed */
  computed_at: string;
  /** Names of data sources used to compute this score */
  data_sources: string[];
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

/**
 * Indicator values for a forecast horizon (not the current year).
 * Requirement 6.1
 */
export interface ForecastIndicators {
  gaiamind_score: number;
  /** GDP in PPP, constant 2015 USD */
  gdp_ppp: number;
  /** Human Development Index */
  hdi: number;
  /** CO₂ emissions per capita */
  co2_per_capita: number;
  governance_effectiveness: number;
  climate_vulnerability: number;
}

/**
 * Confidence interval band expressed as 5th and 95th percentile values.
 * Requirement 6.3
 */
export interface ConfidenceInterval {
  p5: number;
  p95: number;
}

/**
 * A single forecast record for a country / horizon / scenario combination.
 * Requirement 6.1–6.8, 16.3
 */
export interface ForecastObject {
  /** ISO 3166-1 alpha-3 country code */
  iso3: string;
  /** Target forecast year */
  horizon_year: ForecastHorizonYear;
  /** Which scenario this forecast represents */
  scenario: ForecastScenario;
  /** Predicted indicator values for this horizon */
  indicators: ForecastIndicators;
  /** 5th–95th percentile confidence interval for the primary indicator */
  confidence_interval: ConfidenceInterval;
  /** Identifier of the forecasting model used to generate this record */
  model_version: string;
  /** ISO 8601 timestamp of forecast generation */
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Flow Arc
// ---------------------------------------------------------------------------

/**
 * A single great-circle flow arc between two country centroids.
 * Requirement 8.1–8.8
 */
export interface FlowArc {
  /** Origin country ISO3 */
  origin_iso3: string;
  /** Destination country ISO3 */
  destination_iso3: string;
  /** Category of this flow */
  flow_type: FlowType;
  /**
   * Normalised magnitude in [0, 1] after dataset-relative normalisation.
   * Used to compute arc thickness [1–8 px] and particle speed [2–10 s].
   */
  magnitude: number;
  /** Year the flow data refers to */
  year: number;
}

// ---------------------------------------------------------------------------
// Risk Profile
// ---------------------------------------------------------------------------

/**
 * Multi-dimensional risk profile for a single country.
 * Requirement 7.1–7.7
 */
export interface RiskProfile {
  /** ISO 3166-1 alpha-3 country code */
  iso3: string;
  /** Score per risk dimension, each in [0, 100] (100 = highest risk) */
  dimensions: Record<RiskDimension, number>;
  /** Composite risk score in [0, 100] */
  composite: number;
  /** ISO 8601 timestamp of last refresh (refreshed ≥ once per calendar month) */
  last_refreshed: string;
}

// ---------------------------------------------------------------------------
// Real-Time Events
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all real-time planetary event types
 * pushed over the WebSocket and rendered by the Real_Time_Monitor layer.
 * Requirement 13.1–13.4
 */
export type RealTimeEvent =
  | {
      type: 'wildfire';
      lat: number;
      lon: number;
      /** NASA FIRMS confidence level (0–100) */
      confidence: number;
    }
  | {
      type: 'cyclone';
      /** Array of [lon, lat] track points */
      track: [number, number][];
      /** GeoJSON polygon representing the forecast cone */
      forecast_cone: GeoJSON.Polygon;
    }
  | {
      type: 'earthquake';
      lat: number;
      lon: number;
      magnitude: number;
      depth_km: number;
    }
  | {
      type: 'aqi';
      geojson: GeoJSON.FeatureCollection<GeoJSON.Point, { aqi: number }>;
    };

// ---------------------------------------------------------------------------
// Globe Actions (AI Copilot)
// ---------------------------------------------------------------------------

/**
 * Typed commands parsed from the CognitiveKernel response `globe_action` field.
 * The AI Copilot dispatches these to the Zustand store to drive globe state.
 * Requirement 12.6, 12.8
 */
export type GlobeAction =
  | { action: 'navigate'; iso3: string }
  | { action: 'activate-layer'; layer: LayerType }
  | { action: 'highlight-countries'; iso3_list: string[] };

// ---------------------------------------------------------------------------
// Camera State
// ---------------------------------------------------------------------------

/**
 * A delta of rotation in longitude (horizontal) and latitude (vertical) degrees.
 * Produced by InputHandler and consumed by CameraRig.
 * Requirement 2.1
 */
export interface RotationDelta {
  dLon: number;
  dLat: number;
}

/**
 * A delta of altitude in kilometres.
 * Produced by InputHandler zoom events and consumed by CameraRig.
 * Requirement 2.2
 */
export interface ZoomDelta {
  dAltitude: number;
}

/**
 * Full camera position snapshot.
 * Used by CameraRig to apply and clamp incoming input deltas.
 * Requirement 2
 */
export interface CameraState {
  /** Current camera altitude above the Earth surface in kilometres [5, 30000] */
  altitudeKm: number;
  /** Geodetic latitude in degrees [−85, 85] */
  lat: number;
  /** Geodetic longitude in degrees [−180, 180] */
  lon: number;
  /** True while a fly-to animation is in progress */
  isFlying: boolean;
}

// ---------------------------------------------------------------------------
// Time Machine State
// ---------------------------------------------------------------------------

/**
 * Temporal navigation state for the Time Machine slider and playback engine.
 * Requirement 5.1–5.8
 */
export interface TimeMachineState {
  /**
   * Currently selected year in [1950, 2100].
   * Persisted in sessionStorage under key 'dte_year'.
   */
  year: number;
  /** Whether animated playback is currently running */
  playbackActive: boolean;
  /** Current playback speed multiplier */
  playbackSpeed: PlaybackSpeed;
  /**
   * Returns true when `year` is beyond the current calendar year,
   * indicating that data shown is AI-generated forecast data.
   * Requirement 5.3
   */
  isProjected: (year: number) => boolean;
}
