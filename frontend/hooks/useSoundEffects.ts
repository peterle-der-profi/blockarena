'use client';

import { useCallback, useRef } from 'react';

/** Web Audio API sound effects with procedural generation */
export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) => {
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        /* Audio not available */
      }
    },
    [getCtx],
  );

  const playWin = useCallback(() => {
    playTone(523, 0.15, 'sine');
    setTimeout(() => playTone(659, 0.15, 'sine'), 100);
    setTimeout(() => playTone(784, 0.3, 'sine'), 200);
  }, [playTone]);

  const playLoss = useCallback(() => {
    playTone(400, 0.2, 'sawtooth', 0.2);
    setTimeout(() => playTone(300, 0.4, 'sawtooth', 0.15), 150);
  }, [playTone]);

  const playStreak = useCallback(() => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.25), i * 80);
    });
  }, [playTone]);

  const playCountdown = useCallback(() => {
    playTone(800, 0.1, 'square', 0.15);
  }, [playTone]);

  return { playWin, playLoss, playStreak, playCountdown };
}
