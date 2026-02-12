'use client';

import { useEffect, useState } from 'react';

export function FireRain({ active, duration = 3000 }: { active: boolean; duration?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const t = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(t);
    }
  }, [active, duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-fire-rain text-2xl"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
          }}
        >
          🔥
        </span>
      ))}
    </div>
  );
}
