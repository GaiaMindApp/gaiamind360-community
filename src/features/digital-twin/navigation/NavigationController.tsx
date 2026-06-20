/**
 * NavigationController — GaiaMind Digital Twin Earth
 * Orchestrates InputHandler + CameraRig + GeoHierarchyLOD.
 * Updates store on every frame. Shows keyboard shortcut panel on '?' key.
 * Requirements: 2.1, 2.4, 2.5, 2.7–2.10
 */
import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { InputHandler } from './InputHandler';
import { CameraRig } from './CameraRig';
import { getGeoLevel } from './GeoHierarchyLOD';
import { useDigitalTwinStore, digitalTwinStore } from '../store/digitalTwinStore';
import type { CameraRigHandle } from './CameraRig';

// ── Keyboard shortcut panel ───────────────────────────────────────────────────
const SHORTCUTS = [
  { key: '?',           action: 'Show / hide this panel' },
  { key: '← → ↑ ↓',    action: 'Pan camera' },
  { key: '+ / -',       action: 'Zoom in / out' },
  { key: 'Click+Drag',  action: 'Rotate globe' },
  { key: 'Scroll',      action: 'Zoom in / out' },
  { key: 'Pinch',       action: 'Zoom (touch)' },
  { key: 'Esc',         action: 'Close panel / deselect country' },
];

function KeyboardShortcutsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(15,20,35,0.95)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: '24px 32px',
        color: '#fff',
        zIndex: 9999,
        minWidth: 320,
        fontFamily: '"Google Sans", sans-serif',
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
        Keyboard Shortcuts
      </h2>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          {SHORTCUTS.map(({ key, action }) => (
            <tr key={key}>
              <td
                style={{
                  padding: '4px 12px 4px 0',
                  fontFamily: 'monospace',
                  color: '#7dd3fc',
                  whiteSpace: 'nowrap',
                }}
              >
                {key}
              </td>
              <td style={{ padding: '4px 0', color: 'rgba(255,255,255,0.8)' }}>
                {action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={onClose}
        aria-label="Close keyboard shortcuts panel"
        style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          color: '#fff',
          padding: '6px 20px',
          cursor: 'pointer',
          width: '100%',
          fontSize: 13,
        }}
      >
        Close
      </button>
    </div>
  );
}

// ── Main controller (renders inside and outside R3F Canvas) ──────────────────
interface NavigationControllerProps {
  canvasElement: HTMLCanvasElement | null;
}

/** Inner R3F component that drives the camera each frame */
function CameraFrameUpdater({
  rigRef,
}: {
  rigRef: React.MutableRefObject<CameraRigHandle | null>;
}): null {
  const setGeoLevel = digitalTwinStore.setGeoLevel;
  const altKm       = useDigitalTwinStore((s) => s.cameraAltitudeKm);

  useFrame(() => {
    setGeoLevel(getGeoLevel(altKm));
  });

  return null;
}

export function NavigationController({
  canvasElement,
}: NavigationControllerProps): React.ReactElement {
  const rigRef = useRef<CameraRigHandle | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Attach InputHandler to the canvas element
  useEffect(() => {
    if (!canvasElement) return;

    const handler = new InputHandler(
      canvasElement,
      (delta) => {
        digitalTwinStore.setIsFlying(false);
        digitalTwinStore.selectCountry(null);
        rigRef.current?.applyRotation(delta);
      },
      (delta) => {
        digitalTwinStore.setIsFlying(false);
        rigRef.current?.applyZoom(delta);
      },
      (velocity) => rigRef.current?.startMomentum(velocity)
    );

    // Poll gamepad each animation frame
    const rafId = requestAnimationFrame(function poll() {
      handler.pollGamepad();
      requestAnimationFrame(poll);
    });

    return () => {
      handler.destroy();
      cancelAnimationFrame(rafId);
    };
  }, [canvasElement]);

  // Keyboard shortcut '?' handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') setShortcutsOpen((o) => !o);
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Idle detection — auto-rotate after 5 s without input (Req 1.6)
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        digitalTwinStore.setIsFlying(false);
      }, 5000);
    };
    window.addEventListener('mousemove',  resetIdle);
    window.addEventListener('mousedown',  resetIdle);
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('keydown',    resetIdle);
    window.addEventListener('wheel',      resetIdle);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove',  resetIdle);
      window.removeEventListener('mousedown',  resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('keydown',    resetIdle);
      window.removeEventListener('wheel',      resetIdle);
    };
  }, []);

  return (
    <>
      {/* R3F components — must be used inside Canvas */}
      <CameraRig rigRef={rigRef} />
      <CameraFrameUpdater rigRef={rigRef} />

      {/* Keyboard shortcuts overlay — rendered outside Canvas */}
      <KeyboardShortcutsPanel
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );
}

export default NavigationController;
