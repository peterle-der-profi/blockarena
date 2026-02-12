'use client';

import { useApiLeaderboard } from '@/hooks/useApi';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWallet } from '@/components/ConnectWallet';
import { motion } from 'framer-motion';

const MOCK_LEADERBOARD = Array.from({ length: 20 }, (_, i) => ({
  address: `0x${(i + 1).toString(16).padStart(40, 'a')}`,
  wins: 50 - i * 2,
  streak: Math.max(0, 15 - i),
  totalPnL: `${(5 - i * 0.3).toFixed(2)}`,
}));

export default function LeaderboardPage() {
  const entries = useApiLeaderboard();
  const { address } = useWallet();
  const data = entries.length > 0 ? entries : MOCK_LEADERBOARD;

  const getMedal = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold neon-text-purple">🏆 LEADERBOARD</h1>
        <ConnectWallet />
      </div>

      {/* Top 3 podium */}
      <div className="flex justify-center items-end gap-3 mb-8">
        {[1, 0, 2].map((idx) => {
          const entry = data[idx];
          if (!entry) return null;
          const isFirst = idx === 0;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={`text-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}
            >
              <div className={`text-3xl mb-1 ${isFirst ? 'animate-celebration' : ''}`}>{getMedal(idx)}</div>
              <div className={`glass-card rounded-xl p-3 border ${
                isFirst ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(255,215,0,0.15)]' :
                idx === 1 ? 'border-gray-400/20' : 'border-orange-600/20'
              } ${isFirst ? 'w-28' : 'w-24'}`}>
                <div className="font-mono text-xs text-gray-400 truncate">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</div>
                <div className="font-display text-lg font-bold text-white mt-1">{entry.wins}W</div>
                <div className={`text-xs font-bold ${parseFloat(entry.totalPnL) >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                  {parseFloat(entry.totalPnL) >= 0 ? '+' : ''}{entry.totalPnL} ETH
                </div>
                {entry.streak > 0 && (
                  <div className="text-xs text-orange-400 mt-0.5">🔥 {entry.streak}x</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="space-y-1.5">
        {data.map((entry, i) => {
          const isYou = address?.toLowerCase() === entry.address.toLowerCase();
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isYou
                  ? 'glass-card border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'hover:bg-white/3'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-display text-sm font-bold w-8 text-center ${
                  i < 3 ? 'text-yellow-400' : 'text-gray-600'
                }`}>
                  {i < 3 ? getMedal(i) : `${i + 1}`}
                </span>
                <span className="font-mono text-sm text-gray-300">
                  {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  {isYou && <span className="ml-2 text-purple-400 text-xs font-bold">(YOU)</span>}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {entry.streak >= 3 && (
                  <span className="text-xs text-orange-400 font-bold">🔥{entry.streak}</span>
                )}
                <span className="font-display text-sm font-bold text-white">{entry.wins}W</span>
                <span className={`font-display text-sm font-bold ${
                  parseFloat(entry.totalPnL) >= 0 ? 'neon-text-green' : 'neon-text-red'
                }`}>
                  {parseFloat(entry.totalPnL) >= 0 ? '+' : ''}{entry.totalPnL}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
