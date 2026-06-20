/**
 * TimeMachine — GaiaMind Digital Twin Earth
 * Horizontal time slider 1950–2100 with playback and session persistence.
 * Requirements: 5.1–5.8 — Properties 7, 8
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';

const YEAR_MIN     = 1950;
const YEAR_MAX     = 2100;
const ANCHORS      = [1950, 1975, 2000, 2025, 2050, 2100];
const SPEEDS       = [1, 2, 5, 10] as const;
const CURRENT_YEAR = new Date().getFullYear();

/** Property 7: classify year as historical or projected */
export function classifyYear(year: number, now: number): 'historical' | 'projected' {
  return year <= now ? 'historical' : 'projected';
}

/** Property 8: linear interpolation between two snapshot values */
export function lerp(v1: number, v2: number, t: number): number {
  return v1 + t * (v2 - v1);
}

export function TimeMachine(): React.ReactElement {
  const selectedYear    = useDigitalTwinStore((s) => s.selectedYear);
  const playbackActive  = useDigitalTwinStore((s) => s.playbackActive);
  const playbackSpeed   = useDigitalTwinStore((s) => s.playbackSpeed);
  const setYear         = digitalTwinStore.setYear;
  const setPlayback     = digitalTwinStore.setPlaybackActive;
  const setSpeed        = digitalTwinStore.setPlaybackSpeed;
  const [expanded, setExpanded] = React.useState(false);

  const isProjected = classifyYear(selectedYear, CURRENT_YEAR) === 'projected';

  // Playback interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlayback(false);
  }, [setPlayback]);

  const startPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const current = useDigitalTwinStore.getState().selectedYear;
      if (current >= YEAR_MAX) {
        // Auto-stop at 2100 (Req 5.8)
        stopPlayback();
        setYear(YEAR_MAX);
      } else {
        setYear(current + 1);
      }
    }, 1000 / playbackSpeed);
    setPlayback(true);
  }, [playbackSpeed, setPlayback, setYear, stopPlayback]);

  useEffect(() => {
    if (playbackActive) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return stopPlayback;
  }, [playbackActive, playbackSpeed, startPlayback, stopPlayback]);

  const handleSliderChange = (value: number[]) => {
    setYear(value[0]);
  };

  const togglePlayback = () => {
    if (playbackActive) {
      stopPlayback();
    } else {
      if (selectedYear >= YEAR_MAX) setYear(YEAR_MIN);
      startPlayback();
    }
  };

  return (
    <div
      role="region"
      aria-label="Time Machine"
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(8,12,25,0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        zIndex: 200,
        fontFamily: 'var(--font-sans, sans-serif)',
        color: '#fff',
        minWidth: 0,
      }}
    >
      {/* Collapsed: single pill with year + play + expand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px' }}>
        <button
          onClick={togglePlayback}
          aria-label={playbackActive ? 'Pause' : 'Play'}
          style={{
            background: playbackActive ? '#ef4444' : '#22c55e',
            border: 'none', borderRadius: 4, color: '#fff',
            width: 22, height: 22, fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {playbackActive ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{selectedYear}</span>
        {isProjected && (
          <span style={{ background: '#f59e0b', color: '#000', borderRadius: 3, padding: '0 4px', fontSize: 9, fontWeight: 600 }}>Proj.</span>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          aria-label={expanded ? 'Colapsar' : 'Expandir controles'}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 3, color: 'rgba(255,255,255,0.6)',
            width: 18, height: 18, fontSize: 9, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {expanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: '0 8px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Speed buttons */}
          <div style={{ display: 'flex', gap: 3, margin: '6px 0 4px', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginRight: 2 }}>Vel:</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={playbackSpeed === s}
                style={{
                  background: playbackSpeed === s ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 2, color: '#fff',
                  padding: '0 5px', fontSize: 9, cursor: 'pointer',
                  height: 18, lineHeight: '18px',
                }}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Slider */}
          <Slider.Root
            min={YEAR_MIN} max={YEAR_MAX} step={1}
            value={[selectedYear]} onValueChange={handleSliderChange}
            aria-label="Year slider"
            style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 240, height: 16 }}
          >
            <Slider.Track style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 9999, height: 3, flexGrow: 1, position: 'relative' }}>
              <Slider.Range style={{ background: isProjected ? '#f59e0b' : '#3b82f6', borderRadius: 9999, height: '100%', position: 'absolute' }} />
            </Slider.Track>
            <Slider.Thumb
              style={{ width: 12, height: 12, background: '#fff', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(59,130,246,0.5)', cursor: 'pointer', outline: 'none' }}
              aria-label={`Year ${selectedYear}`}
            />
          </Slider.Root>

          {/* Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 8, opacity: 0.4, width: 240 }}>
            {ANCHORS.map((y) => <span key={y}>{y}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeMachine;
