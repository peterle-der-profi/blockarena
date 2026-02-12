'use client';

import { useState, useEffect } from 'react';

export function LiveSpectatorBar() {
  const [viewers, setViewers] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => Math.max(1, v + Math.floor(Math.random() * 7) - 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      <span>👀 {viewers}</span>
    </div>
  );
}
