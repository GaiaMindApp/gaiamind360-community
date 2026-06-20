import { useState, useEffect } from 'react';

interface DeviceState {
  isMobile: boolean;   // < 768px
  isTablet: boolean;   // 768–1023px
  isDesktop: boolean;  // >= 1024px
  width: number;
}

function getState(w: number): DeviceState {
  return {
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024,
    width: w,
  };
}

export function useDevice(): DeviceState {
  const [state, setState] = useState<DeviceState>(() => getState(window.innerWidth));

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = () => setState(getState(window.innerWidth));

    // matchMedia listener (mais eficiente que resize)
    mql.addEventListener('change', handler);
    // resize cobre rotação e edge cases
    window.addEventListener('resize', handler, { passive: true });

    return () => {
      mql.removeEventListener('change', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return state;
}
