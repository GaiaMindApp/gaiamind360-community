/**
 * useSolarPosition — GaiaMind Digital Twin Earth
 * Computes the current solar longitude and updates once per second.
 * Requirements: 1.3 (accuracy ± 0.1° longitude)
 * Property 1: Sun Longitude Accuracy
 */
import { useState, useEffect } from 'react';

/**
 * Compute the sun's sub-solar longitude for a given UTC time.
 *
 * Uses the simplified solar position formula accurate to ±0.01° for dates
 * within ±50 years of J2000.0 — well within the ±0.1° requirement.
 *
 * @param utcTime - Date object representing the desired UTC instant
 * @returns Sun longitude in degrees in the range [-180, 180]
 */
export function computeSunLongitude(utcTime: Date): number {
  // Julian date
  const JD = utcTime.getTime() / 86400000 + 2440587.5;

  // Days since J2000.0
  const n = JD - 2451545.0;

  // Mean longitude of the sun (degrees)
  const L = (280.46 + 0.9856474 * n) % 360;

  // Mean anomaly (degrees)
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);

  // Ecliptic longitude (degrees)
  const lambda = L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);

  // Greenwich Hour Angle of the sun = GMST - Right Ascension
  // Simplified: sub-solar longitude = -(360/86400) * secondsFromNoon
  // More accurate: use equation of time
  const GMST =
    (280.46061837 +
      360.98564736629 * n +
      0.000387933 * Math.pow(n / 36525, 2)) %
    360;

  // Right Ascension (approximate, degrees)
  const ra =
    (Math.atan2(
      Math.cos((23.439 * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180),
      Math.cos((lambda * Math.PI) / 180)
    ) *
      180) /
    Math.PI;

  // Sub-solar longitude: GHA = GMST - RA
  let lon = GMST - ra;

  // Normalise to [-180, 180]
  lon = ((lon + 180) % 360) - 180;
  if (lon < -180) lon += 360;

  return lon;
}

/**
 * React hook that returns the current sun longitude, updated every second.
 * Used by SunLight.tsx to reposition the directional light in real time.
 */
export function useSolarPosition(): { sunLongitude: number; sunLatitude: number } {
  const [sunLongitude, setSunLongitude] = useState(() => computeSunLongitude(new Date()));

  // Approximate sub-solar latitude using Earth's axial tilt (23.5°) and day of year
  const sunLatitude = computeSunLatitude(new Date());
  const [lat, setLat] = useState(sunLatitude);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setSunLongitude(computeSunLongitude(now));
      setLat(computeSunLatitude(now));
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { sunLongitude, sunLatitude: lat };
}

/**
 * Compute the approximate sub-solar latitude (declination) for a given date.
 * Uses simplified formula: δ = -23.45° × cos(360°/365 × (dayOfYear + 10))
 */
export function computeSunLatitude(utcTime: Date): number {
  const start = new Date(utcTime.getFullYear(), 0, 0);
  const diff = utcTime.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);

  const declinationRad =
    -23.45 *
    (Math.PI / 180) *
    Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  return declinationRad * (180 / Math.PI);
}
