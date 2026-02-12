'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ScreenShakeProps {
  trigger: number; // increment to trigger
  children: ReactNode;
}

export function ScreenShake({ trigger, children }: ScreenShakeProps) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (trigger > 0) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return (
    <div className={shaking ? 'animate-screen-shake' : ''}>{children}</div>
  );
}
