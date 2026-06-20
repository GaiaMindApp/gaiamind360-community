import * as THREE from 'three';

export class TransitionManager {
  private activeTransitions = new Map<string, any>();

  // Smooth transition between visualization modes
  transitionVisualizationMode(
    fromMode: string,
    toMode: string,
    duration: number = 1000,
    onUpdate?: (progress: number) => void,
    onComplete?: () => void
  ) {
    const transitionId = `mode-${Date.now()}`;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth transition
      const easedProgress = this.easeInOutCubic(progress);
      
      if (onUpdate) {
        onUpdate(easedProgress);
      }

      if (progress < 1) {
        this.activeTransitions.set(transitionId, requestAnimationFrame(animate));
      } else {
        this.activeTransitions.delete(transitionId);
        if (onComplete) {
          onComplete();
        }
      }
    };

    animate();
    return transitionId;
  }

  // Animate camera movement to focus on specific location
  animateCameraToLocation(
    camera: THREE.Camera,
    controls: any,
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number = 2000
  ) {
    const startPosition = camera.position.clone();
    const startLookAt = controls.target.clone();
    const transitionId = `camera-${Date.now()}`;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      // Interpolate camera position
      camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
      
      // Interpolate look-at target
      const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, easedProgress);
      controls.target.copy(currentLookAt);
      controls.update();

      if (progress < 1) {
        this.activeTransitions.set(transitionId, requestAnimationFrame(animate));
      } else {
        this.activeTransitions.delete(transitionId);
      }
    };

    animate();
    return transitionId;
  }

  // Fade transition for layer visibility
  fadeLayer(
    material: THREE.Material | THREE.Material[],
    fromOpacity: number,
    toOpacity: number,
    duration: number = 500
  ) {
    const materials = Array.isArray(material) ? material : [material];
    const transitionId = `fade-${Date.now()}`;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      const currentOpacity = fromOpacity + (toOpacity - fromOpacity) * easedProgress;
      
      materials.forEach(mat => {
        if ('opacity' in mat) {
          mat.opacity = currentOpacity;
        }
      });

      if (progress < 1) {
        this.activeTransitions.set(transitionId, requestAnimationFrame(animate));
      } else {
        this.activeTransitions.delete(transitionId);
      }
    };

    animate();
    return transitionId;
  }

  // Morphing transition between different data visualizations
  morphDataVisualization(
    geometry: THREE.BufferGeometry,
    fromPositions: Float32Array,
    toPositions: Float32Array,
    duration: number = 1500
  ) {
    const transitionId = `morph-${Date.now()}`;
    const startTime = Date.now();
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      // Interpolate between positions
      for (let i = 0; i < fromPositions.length; i++) {
        const currentValue = fromPositions[i] + (toPositions[i] - fromPositions[i]) * easedProgress;
        positionAttribute.setX(i / 3, currentValue);
      }

      positionAttribute.needsUpdate = true;

      if (progress < 1) {
        this.activeTransitions.set(transitionId, requestAnimationFrame(animate));
      } else {
        this.activeTransitions.delete(transitionId);
      }
    };

    animate();
    return transitionId;
  }

  // Color transition for data points
  transitionColors(
    geometry: THREE.BufferGeometry,
    fromColors: Float32Array,
    toColors: Float32Array,
    duration: number = 1000
  ) {
    const transitionId = `color-${Date.now()}`;
    const startTime = Date.now();
    const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      for (let i = 0; i < fromColors.length; i++) {
        const currentValue = fromColors[i] + (toColors[i] - fromColors[i]) * easedProgress;
        colorAttribute.setX(i, currentValue);
      }

      colorAttribute.needsUpdate = true;

      if (progress < 1) {
        this.activeTransitions.set(transitionId, requestAnimationFrame(animate));
      } else {
        this.activeTransitions.delete(transitionId);
      }
    };

    animate();
    return transitionId;
  }

  // Cancel specific transition
  cancelTransition(transitionId: string) {
    const animationId = this.activeTransitions.get(transitionId);
    if (animationId) {
      cancelAnimationFrame(animationId);
      this.activeTransitions.delete(transitionId);
    }
  }

  // Cancel all active transitions
  cancelAllTransitions() {
    this.activeTransitions.forEach((animationId) => {
      cancelAnimationFrame(animationId);
    });
    this.activeTransitions.clear();
  }

  // Easing functions
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private easeInOutBack(t: number): number {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }
}

export const transitionManager = new TransitionManager();