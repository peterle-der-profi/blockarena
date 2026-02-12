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

export default function OverlayPage() {
  const [data, setData] = useState<OverlayData>(MOCK_DATA);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:3001/overlay');
      ws.onmessage = (e) => { try { setData(JSON.parse(e.data)); } catch {} };
      ws.onerror = () => ws?.close();
    } catch {}
    return () => ws?.close();
  }, []);

  return (
    <div className="w-[1920px] h-[1080px] relative overflow-hidden" style={{ background: 'transparent' }}>
      {/* Current Arena */}
      {data.currentArena && (
        <div className="absolute top-6 left-6 glass-card rounded-2xl p-5 border border-purple-500/20 w-80" style={{ background: 'rgba(10,10,15,0.85)' }}>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-display mb-1">LIVE ARENA</div>
          <div className="font-display text-3xl font-black neon-text-purple">#{data.currentArena.id}</div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="font-display text-purple-400 text-xs tracking-widest">{data.currentArena.tier.toUpperCase()}</span>
            <span className="font-display neon-text-gold text-sm font-bold">{data.currentArena.pot} ETH</span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-neon-pulse" style={{ width: '60%' }} />
            </div>
            <div className="text-xs neon-text-green font-display mt-1 font-bold">{data.currentArena.blocksLeft} blocks left</div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="absolute top-6 right-6 rounded-2xl p-5 border border-purple-500/20 w-96" style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-display mb-3">LEADERBOARD</div>
        {data.leaderboard.map((entry, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 text-sm">
            <div className="flex items-center gap-3">
              <span className={`font-display font-bold w-6 text-center ${i < 3 ? 'neon-text-gold' : 'text-gray-600'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <span className="font-mono text-gray-300 text-xs">{entry.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-white">{entry.score}</span>
              {entry.streak >= 3 && (
                <span className="text-xs neon-text-gold font-bold">🔥{entry.streak}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Predictions */}
      <div className="absolute bottom-6 left-6 rounded-2xl p-5 border border-purple-500/20" style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-display mb-3">LIVE PREDICTIONS</div>
        <div className="flex gap-2">
          {data.predictions.map((p, i) => (
            <span
              key={i}
              className={`px-4 py-1.5 rounded-full text-sm font-display font-bold ${
                p.direction === 'up'
                  ? 'bg-green-500/20 neon-text-green border border-green-500/30'
                  : 'bg-red-500/20 neon-text-red border border-red-500/30'
              }`}
            >
              {p.address.slice(0, 6)} {p.direction === 'up' ? '↑' : '↓'}
            </span>
          ))}
        </div>
      </div>

      {/* Hot Streaks */}
      <div className="absolute bottom-6 right-6 rounded-2xl p-5 border border-orange-500/20" style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-display mb-3">🔥 HOT STREAKS</div>
        {data.streaks.map((s, i) => (
          <div key={i} className="flex justify-between gap-6 text-sm py-1">
            <span className="font-mono text-gray-400 text-xs">{s.address}</span>
            <span className="neon-text-gold font-display font-bold">{s.streak}x 🔥</span>
          </div>
        ))}
      </div>

      {/* BlockArena watermark */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <span className="font-display text-sm neon-text-purple opacity-60 tracking-[0.3em]">⚡ BLOCKARENA</span>
      </div>
    </div>
  );
}
