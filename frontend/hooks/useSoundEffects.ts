'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('blockarena-muted');
    if (stored !== null) setMuted(stored === 'true');

    const handler = (e: Event) => setMuted((e as CustomEvent).detail);
    window.addEventListener('blockarena-mute', handler);
    return () => window.removeEventListener('blockarena-mute', handler);
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) => {
      if (muted) return;
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
      } catch { /* Audio not available */ }
    },
    [getCtx, muted],
  );

  const playTick = useCallback(() => {
    playTone(1200, 0.05, 'sine', 0.15);
  }, [playTone]);

  const playCorrect = useCallback(() => {
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.2), 80);
  }, [playTone]);

  const playWin = useCallback(() => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.25), i * 100);
    });
  }, [playTone]);

  const playLoss = useCallback(() => {
    playTone(300, 0.3, 'sawtooth', 0.15);
    setTimeout(() => playTone(200, 0.5, 'sawtooth', 0.1), 200);
  }, [playTone]);

  const playStreak = useCallback((milestone: number) => {
    const base = milestone >= 25 ? 6 : milestone >= 10 ? 5 : 4;
    const freqs = [523, 659, 784, 1047, 1319, 1568].slice(0, base);
    freqs.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.25, 'sine', 0.3), i * 70);
    });
  }, [playTone]);

  const playCountdown = useCallback(() => {
    playTone(800, 0.08, 'square', 0.12);
  }, [playTone]);

  const playGo = useCallback(() => {
    playTone(1047, 0.3, 'sine', 0.35);
    setTimeout(() => playTone(1319, 0.4, 'sine', 0.3), 150);
  }, [playTone]);

  return { playTick, playCorrect, playWin, playLoss, playStreak, playCountdown, playGo, muted };
}
