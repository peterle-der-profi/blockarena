'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const EMOJIS = ['🎉', '🔥', '⚡', '🏆', '✨', '💎'];

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
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
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-confetti-fall text-2xl"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </span>
      ))}
    </div>
  );
}
