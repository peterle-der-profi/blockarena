'use client';

import type { ArenaHistoryEntry } from '@/types';

/**
 * Lightweight SVG-based chart — no external dependency.
 * Shows cumulative P&L over arena history.
 */
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
  const color = lastVal >= 0 ? '#4ade80' : '#f87171';

  return (
    <div className="w-full">
      <div className="text-sm font-bold text-gray-400 mb-2">Cumulative P&L</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* Zero line */}
        {min < 0 && max > 0 && (
          <line
            x1={pad}
            x2={w - pad}
            y1={pad + (1 - (0 - min) / range) * (h - 2 * pad)}
            y2={pad + (1 - (0 - min) / range) * (h - 2 * pad)}
            stroke="#6b7280"
            strokeDasharray="4"
            strokeWidth="1"
          />
        )}
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.join(' ')} />
        {/* End dot */}
        {points.length > 0 && (
          <circle
            cx={parseFloat(points[points.length - 1].split(',')[0])}
            cy={parseFloat(points[points.length - 1].split(',')[1])}
            r="4"
            fill={color}
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Oldest</span>
        <span className={lastVal >= 0 ? 'text-green-400' : 'text-red-400'}>
          {lastVal >= 0 ? '+' : ''}
          {lastVal.toFixed(4)} ETH
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
        <circle cx="50" cy="50" r={r} fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#4ade80"
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="16" fontWeight="bold">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <div className="text-sm">
        <div className="text-green-400">{wins} wins</div>
        <div className="text-red-400">{losses} losses</div>
      </div>
    </div>
  );
}
