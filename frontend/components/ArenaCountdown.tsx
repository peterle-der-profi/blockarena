'use client';

import { useEffect, useState } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface ArenaCountdownProps {
  blocksRemaining: number;
  label?: string;
}

export function ArenaCountdown({ blocksRemaining, label = 'NEXT ARENA' }: ArenaCountdownProps) {
  const { playCountdown, playGo } = useSoundEffects();
  const [flash, setFlash] = useState(false);
  const isFinal3 = blocksRemaining <= 3 && blocksRemaining > 0;
  const isGo = blocksRemaining === 0;

  useEffect(() => {
    if (isFinal3) playCountdown();
    if (isGo) {
      playGo();
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }
  }, [blocksRemaining, isFinal3, isGo, playCountdown, playGo]);

  if (isGo) {
    return (
      <>
        {flash && <div className="fixed inset-0 bg-white/20 z-50 pointer-events-none animate-[screen-flash_0.3s_ease-out_forwards]" />}
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-black neon-text-green animate-celebration">GO!</span>
        </div>
      </>
    );
  }

  if (isFinal3) {
    return (
      <div className="flex items-center justify-center">
        <span
          key={blocksRemaining}
          className="font-display text-3xl font-black neon-text-gold animate-countdown-slam"
        >
          {blocksRemaining}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="animate-heartbeat text-red-500">❤️</span>
      <span className="text-xs text-gray-400 font-medium">{label} IN</span>
      <span className="font-display text-sm font-bold neon-text-blue">{blocksRemaining}</span>
      <span className="text-xs text-gray-500">blocks</span>
    </div>
  );
}
