/**
 * InputHandler — GaiaMind Digital Twin Earth
 * Normalises mouse drag, touch swipe, keyboard arrows, and gamepad sticks
 * into RotationDelta and ZoomDelta. Tracks release velocity for momentum.
 * Requirements: 2.1, 2.4, 2.6
 */
import type { RotationDelta, ZoomDelta } from '../types/digitalTwin.types';

export interface InputState {
  rotationDelta: RotationDelta;
  zoomDelta: ZoomDelta;
  /** Velocity at release (deg/s) for momentum deceleration */
  releaseVelocity: RotationDelta;
}

// ── Sensitivity constants ──────────────────────────────────────────────────
const MOUSE_SENSITIVITY   = 0.3;   // degrees per pixel
const TOUCH_SENSITIVITY   = 0.3;
const KEYBOARD_PAN_PCT    = 0.05;  // 5% of viewport width per keypress (Req 2.4)
const SCROLL_ZOOM_FACTOR  = 500;   // km per scroll unit
const GAMEPAD_SENSITIVITY = 2.0;
const GAMEPAD_ZOOM_SENSITIVITY = 800;

export class InputHandler {
  private element: HTMLElement;
  private isDragging = false;
  private lastPointer: { x: number; y: number } | null = null;
  private velocity: RotationDelta = { dLon: 0, dLat: 0 };
  private currentDelta: RotationDelta = { dLon: 0, dLat: 0 };
  private currentZoom: ZoomDelta = { dAltitude: 0 };

  private onRotate: (delta: RotationDelta) => void;
  private onZoom:   (delta: ZoomDelta) => void;
  private onRelease: (velocity: RotationDelta) => void;

  constructor(
    element: HTMLElement,
    onRotate: (delta: RotationDelta) => void,
    onZoom:   (delta: ZoomDelta) => void,
    onRelease: (velocity: RotationDelta) => void
  ) {
    this.element   = element;
    this.onRotate  = onRotate;
    this.onZoom    = onZoom;
    this.onRelease = onRelease;
    this.attachListeners();
  }

  private attachListeners(): void {
    this.element.addEventListener('mousedown',   this.onMouseDown);
    this.element.addEventListener('mousemove',   this.onMouseMove);
    this.element.addEventListener('mouseup',     this.onMouseUp);
    this.element.addEventListener('mouseleave',  this.onMouseUp);
    this.element.addEventListener('wheel',       this.onWheel, { passive: false });
    this.element.addEventListener('touchstart',  this.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove',   this.onTouchMove,  { passive: false });
    this.element.addEventListener('touchend',    this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
  }

  destroy(): void {
    this.element.removeEventListener('mousedown',  this.onMouseDown);
    this.element.removeEventListener('mousemove',  this.onMouseMove);
    this.element.removeEventListener('mouseup',    this.onMouseUp);
    this.element.removeEventListener('mouseleave', this.onMouseUp);
    this.element.removeEventListener('wheel',      this.onWheel);
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove',  this.onTouchMove);
    this.element.removeEventListener('touchend',   this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  // ── Mouse ────────────────────────────────────────────────────────────────
  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging   = true;
    this.lastPointer  = { x: e.clientX, y: e.clientY };
    this.velocity     = { dLon: 0, dLat: 0 };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.lastPointer) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    const delta: RotationDelta = {
      dLon: dx * MOUSE_SENSITIVITY,
      dLat: dy * MOUSE_SENSITIVITY,
    };
    this.velocity = delta;
    this.onRotate(delta);
  };

  private onMouseUp = (): void => {
    if (this.isDragging) {
      this.onRelease(this.velocity);
    }
    this.isDragging  = false;
    this.lastPointer = null;
  };

  // ── Wheel ────────────────────────────────────────────────────────────────
  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.onZoom({ dAltitude: e.deltaY * SCROLL_ZOOM_FACTOR / 100 });
  };

  // ── Touch ────────────────────────────────────────────────────────────────
  private lastTouchDistance = 0;

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging  = true;
      this.lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.velocity    = { dLon: 0, dLat: 0 };
    } else if (e.touches.length === 2) {
      this.lastTouchDistance = getTouchDistance(e.touches);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging && this.lastPointer) {
      const dx = e.touches[0].clientX - this.lastPointer.x;
      const dy = e.touches[0].clientY - this.lastPointer.y;
      this.lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const delta: RotationDelta = {
        dLon: dx * TOUCH_SENSITIVITY,
        dLat: dy * TOUCH_SENSITIVITY,
      };
      this.velocity = delta;
      this.onRotate(delta);
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const dz   = (this.lastTouchDistance - dist) * SCROLL_ZOOM_FACTOR / 100;
      this.lastTouchDistance = dist;
      this.onZoom({ dAltitude: dz });
    }
  };

  private onTouchEnd = (): void => {
    if (this.isDragging) {
      this.onRelease(this.velocity);
    }
    this.isDragging  = false;
    this.lastPointer = null;
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────
  private onKeyDown = (e: KeyboardEvent): void => {
    const viewportWidth = window.innerWidth;
    const panDeg = viewportWidth * KEYBOARD_PAN_PCT * 0.05; // approx deg

    switch (e.key) {
      case 'ArrowLeft':  this.onRotate({ dLon:  panDeg, dLat: 0 }); break;
      case 'ArrowRight': this.onRotate({ dLon: -panDeg, dLat: 0 }); break;
      case 'ArrowUp':    this.onRotate({ dLon: 0, dLat: -panDeg }); break;
      case 'ArrowDown':  this.onRotate({ dLon: 0, dLat:  panDeg }); break;
      case '+':
      case '=':          this.onZoom({ dAltitude: -SCROLL_ZOOM_FACTOR }); break;
      case '-':          this.onZoom({ dAltitude:  SCROLL_ZOOM_FACTOR }); break;
    }
  };

  /** Poll gamepad — call once per animation frame */
  pollGamepad(): void {
    const gamepads = navigator.getGamepads?.();
    if (!gamepads) return;
    for (const gp of gamepads) {
      if (!gp) continue;
      const lx = applyDeadZone(gp.axes[0]);
      const ly = applyDeadZone(gp.axes[1]);
      if (Math.abs(lx) > 0 || Math.abs(ly) > 0) {
        this.onRotate({ dLon: lx * GAMEPAD_SENSITIVITY, dLat: ly * GAMEPAD_SENSITIVITY });
      }
      // Right trigger (index 7) zoom in, left trigger (index 6) zoom out
      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.05 || lt > 0.05) {
        this.onZoom({ dAltitude: (lt - rt) * GAMEPAD_ZOOM_SENSITIVITY });
      }
    }
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────
function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function applyDeadZone(value: number, threshold = 0.1): number {
  return Math.abs(value) < threshold ? 0 : value;
}
