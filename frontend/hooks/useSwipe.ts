'use client';

import { useRef, useCallback, type TouchEvent } from 'react';

export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 50) {
  const startX = useRef(0);

  const onTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(diff) > threshold) {
        if (diff > 0) onRight();
        else onLeft();
      }
    },
    [onLeft, onRight, threshold],
  );

  return { onTouchStart, onTouchEnd };
}
