'use client';

import type { ArenaHistoryEntry } from '@/types';

export function PnLChart({ history }: { history: ArenaHistoryEntry[] }) {
  if (history.length < 2) return null;

  const sorted = [...history].reverse();
  const cumulative: number[] = [];
  let sum = 0;
  for (const entry of sorted) {
    sum += parseFloat(entry.pnl);
    cumulative.push(sum);
  }

  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 1;
  const w = 400;
  const h = 150;
  const pad = 20;

  const points = cumulative.map((v, i) => {
    const x = pad + (i / (cumulative.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });

  const lastVal = cumulative[cumulative.length - 1];
  const isUp = lastVal >= 0;
  const color = isUp ? '#39ff14' : '#ff1744';

  return (
    <div className="w-full">
      <div className="text-[10px] text-gray-600 uppercase tracking-widest font-display mb-2">CUMULATIVE P&L</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {min < 0 && max > 0 && (
          <line
            x1={pad} x2={w - pad}
            y1={pad + (1 - (0 - min) / range) * (h - 2 * pad)}
            y2={pad + (1 - (0 - min) / range) * (h - 2 * pad)}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="4" strokeWidth="1"
          />
        )}
        <polygon
          fill="url(#pnlGrad)"
          points={`${pad},${h - pad} ${points.join(' ')} ${w - pad},${h - pad}`}
        />
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.join(' ')} />
        {points.length > 0 && (
          <circle
            cx={parseFloat(points[points.length - 1].split(',')[0])}
            cy={parseFloat(points[points.length - 1].split(',')[1])}
            r="4" fill={color}
          />
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-600 font-display">
        <span>Oldest</span>
        <span className={isUp ? 'neon-text-green' : 'neon-text-red'}>
          {isUp ? '+' : ''}{lastVal.toFixed(4)} ETH
        </span>
        <span>Latest</span>
      </div>
    </div>
  );
}

export function WinRateChart({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return null;
  const pct = (wins / total) * 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none" stroke="#39ff14" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(57,255,20,0.4))' }}
        >
          <animate attributeName="stroke-dashoffset" from={circ} to={offset} dur="1s" fill="freeze" />
        </circle>
        <text x="50" y="46" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="18" fontWeight="bold" fontFamily="Orbitron, monospace">
          {pct.toFixed(0)}%
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#666" fontSize="8" fontFamily="Inter, sans-serif">
          WIN RATE
        </text>
      </svg>
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(57,255,20,0.5)]" />
          <span className="text-green-400 font-display">{wins} wins</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(255,23,68,0.5)]" />
          <span className="text-red-400 font-display">{losses} losses</span>
        </div>
      </div>
    </div>
  );
}
