'use client';

import { useState, useEffect } from 'react';

export function SoundToggle() {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('blockarena-muted');
    if (stored !== null) setMuted(stored === 'true');
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('blockarena-muted', String(next));
    window.dispatchEvent(new CustomEvent('blockarena-mute', { detail: next }));
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full glass-card flex items-center justify-center text-lg hover:scale-110 transition-transform md:top-6 md:right-6"
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
