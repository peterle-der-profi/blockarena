'use client';

import { useWallet } from '@/hooks/useWallet';
import { usePlayerStats } from '@/hooks/useStats';
import { PnLChart, WinRateChart } from '@/components/StatsChart';
import { GodStreak } from '@/components/GodStreak';
import { ConnectWallet } from '@/components/ConnectWallet';
import { TIER_CONFIG } from '@/types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryPage() {
  const { address, isConnected } = useWallet();
  const { stats, history } = usePlayerStats(address);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold neon-text-blue">📊 PROFILE</h1>
        <ConnectWallet />
      </div>

      {!isConnected && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-500">Connect your wallet to see stats</p>
        </div>
      )}

      {isConnected && stats && (
        <>
          {/* Member badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 glass-card rounded-xl p-4 border border-purple-500/10"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-display text-lg font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              {address?.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <div className="font-mono text-sm text-white">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Member since Jan 2026</div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'ARENAS', value: stats.arenasPlayed.toString(), color: '' },
              { label: 'P&L', value: `${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(4)}`, color: stats.totalPnL >= 0 ? 'neon-text-green' : 'neon-text-red' },
              { label: 'BEST STREAK', value: `${stats.bestStreak}x 🔥`, color: 'neon-text-gold' },
              { label: 'WIN RATE', value: `${((stats.wins / Math.max(stats.wins + stats.losses, 1)) * 100).toFixed(0)}%`, color: 'neon-text-blue' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-3 text-center border border-white/5"
              >
                <div className={`font-display text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest font-display mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <WinRateChart wins={stats.wins} losses={stats.losses} />
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <PnLChart history={history} />
            </div>
          </div>

          {/* God Streak */}
          <div className="mb-6">
            <GodStreak streak={3} best={stats.bestStreak} />
          </div>

          {/* History */}
          <h2 className="font-display text-lg font-bold mb-3 text-white/80">ARENA HISTORY</h2>
          <div className="space-y-1.5">
            {history.map((entry, i) => {
              const tier = TIER_CONFIG[entry.tier];
              const isExpanded = expandedId === entry.arenaId;
              return (
                <motion.div
                  key={entry.arenaId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card rounded-xl border border-white/5 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.arenaId)}
                    className="w-full flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${tier.color} font-display font-bold text-xs`}>{tier.label.toUpperCase()}</span>
                      <span className="text-gray-600 text-xs">#{entry.arenaId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-display font-bold text-sm ${
                        entry.result === 'win' ? 'neon-text-green' : 'neon-text-red'
                      }`}>
                        {entry.pnl} ETH
                      </span>
                      <span className="text-gray-700 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3 text-xs text-gray-500"
                      >
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                          <div>Entry: {entry.entryFee} ETH</div>
                          <div>Score: <span className="font-display">{entry.score}</span></div>
                          <div>Players: {entry.totalPlayers}</div>
                          <div>Result: <span className={entry.result === 'win' ? 'text-green-400' : 'text-red-400'}>{entry.result.toUpperCase()}</span></div>
                          <div className="col-span-2 text-gray-600">{new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
