'use client';

import { useEffect, useState } from 'react';

const EMOJIS = ['🎉', '🔥', '⚡', '🏆', '✨', '💎', '🎊', '💰'];

export function Confetti({ active, duration = 3500 }: { active: boolean; duration?: number }) {
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
      {/* Gold flash */}
      <div className="absolute inset-0 animate-gold-flash" />
      {/* Particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-confetti-fall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1.2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            fontSize: `${16 + Math.random() * 16}px`,
          }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </span>
      ))}
    </div>
  );
}
