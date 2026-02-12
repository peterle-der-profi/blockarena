'use client';

import { useLivePrices } from '@/hooks/useApi';

interface PriceChartProps {
  arenaId?: number;
  height?: number;
}

export function PriceChart({ arenaId, height = 200 }: PriceChartProps) {
  const { prices, connected } = useLivePrices(arenaId);

  if (prices.length < 2) {
    return (
      <div className="glass-card rounded-xl p-6 text-center border border-purple-500/10">
        <div className="text-sm text-gray-500">
          {connected ? (
            <span className="animate-neon-pulse">⏳ Waiting for price data...</span>
          ) : (
            <span>🔌 Connecting to price feed...</span>
          )}
        </div>
      </div>
    );
  }

  const values = prices.map((p) => parseFloat(p.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 600;
  const h = height;
  const pad = 30;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });

  const lastPrice = values[values.length - 1];
  const firstPrice = values[0];
  const change = lastPrice - firstPrice;
  const isUp = change >= 0;
  const color = isUp ? '#39ff14' : '#ff1744';
  const glowColor = isUp ? 'rgba(57,255,20,0.15)' : 'rgba(255,23,68,0.15)';

  return (
    <div className="glass-card rounded-xl p-4 border border-purple-500/10">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-display">PRICE FEED</span>
          {connected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-white">${lastPrice.toFixed(2)}</span>
          <span className={`font-display text-sm font-bold ${isUp ? 'neon-text-green' : 'neon-text-red'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={pad} x2={w - pad}
            y1={pad + pct * (h - 2 * pad)}
            y2={pad + pct * (h - 2 * pad)}
            stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
          />
        ))}
        {/* Fill */}
        <polygon
          fill="url(#chartGrad)"
          points={`${pad},${h - pad} ${points.join(' ')} ${w - pad},${h - pad}`}
        />
        {/* Line */}
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.join(' ')} filter="url(#glow)" />
        {/* Dot */}
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="4" fill={color}
        />
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="8" fill={color} opacity="0.3"
        >
          <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-display">
        <span>#{prices[0].block}</span>
        <span>{prices.length} pts</span>
        <span>#{prices[prices.length - 1].block}</span>
      </div>
    </div>
  );
}
