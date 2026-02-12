'use client';

import { useEffect, useState } from 'react';
import type { OverlayData } from '@/types';

const MOCK_DATA: OverlayData = {
  currentArena: { id: 42, tier: 'high', pot: '2.5', blocksLeft: 150 },
  leaderboard: [
    { address: '0xABCD...1234', score: 185, streak: 7 },
    { address: '0xDEAD...BEEF', score: 172, streak: 3 },
    { address: '0x1234...5678', score: 160, streak: 1 },
    { address: '0xFACE...CAFE', score: 145, streak: 0 },
    { address: '0xBABE...BABE', score: 130, streak: 5 },
  ],
  predictions: [
    { address: '0xABCD', direction: 'up' },
    { address: '0xDEAD', direction: 'down' },
  ],
  streaks: [
    { address: '0xABCD...1234', streak: 7 },
    { address: '0xBABE...BABE', streak: 5 },
    { address: '0xDEAD...BEEF', streak: 3 },
  ],
};

/**
 * OBS-compatible streaming overlay
 * Transparent background, 1920x1080
 * Route: /overlay
 */
export default function OverlayPage() {
  const [data, setData] = useState<OverlayData>(MOCK_DATA);

  // WebSocket auto-update (placeholder — connects when backend is available)
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:3001/overlay');
      ws.onmessage = (e) => {
        try {
          setData(JSON.parse(e.data));
        } catch { /* ignore */ }
      };
      ws.onerror = () => ws?.close();
    } catch { /* backend not available, use mock */ }
    return () => ws?.close();
  }, []);

  return (
    <div
      className="w-[1920px] h-[1080px] relative overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Current Arena */}
      {data.currentArena && (
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur rounded-xl p-4 border border-gray-700 w-72">
          <div className="text-xs text-gray-400 mb-1">LIVE ARENA</div>
          <div className="text-2xl font-bold">Arena #{data.currentArena.id}</div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-purple-400">{data.currentArena.tier.toUpperCase()}</span>
            <span className="text-yellow-400">{data.currentArena.pot} ETH</span>
          </div>
          <div className="mt-2 text-sm text-green-400 animate-pulse">
            {data.currentArena.blocksLeft} blocks left
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="absolute top-6 right-6 bg-black/70 backdrop-blur rounded-xl p-4 border border-gray-700 w-80">
        <div className="text-xs text-gray-400 mb-2">LEADERBOARD</div>
        {data.leaderboard.map((entry, i) => (
          <div key={i} className="flex justify-between items-center py-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-5">{i + 1}.</span>
              <span className="font-mono">{entry.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{entry.score}</span>
              {entry.streak >= 3 && (
                <span className="text-orange-400 text-xs">🔥{entry.streak}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Predictions */}
      <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur rounded-xl p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-2">LIVE PREDICTIONS</div>
        <div className="flex gap-2">
          {data.predictions.map((p, i) => (
            <span
              key={i}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                p.direction === 'up' ? 'bg-green-600/50 text-green-300' : 'bg-red-600/50 text-red-300'
              }`}
            >
              {p.address.slice(0, 6)} {p.direction === 'up' ? '↑' : '↓'}
            </span>
          ))}
        </div>
      </div>

      {/* Hot Streaks */}
      <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur rounded-xl p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-2">🔥 HOT STREAKS</div>
        {data.streaks.map((s, i) => (
          <div key={i} className="flex justify-between gap-4 text-sm py-0.5">
            <span className="font-mono">{s.address}</span>
            <span className="text-orange-400 font-bold">{s.streak}x 🔥</span>
          </div>
        ))}
      </div>
    </div>
  );
}
