'use client';

import { useWallet } from '@/hooks/useWallet';
import { usePlayerStats } from '@/hooks/useStats';
import { PnLChart, WinRateChart } from '@/components/StatsChart';
import { GodStreak } from '@/components/GodStreak';
import { ConnectWallet } from '@/components/ConnectWallet';
import { TIER_CONFIG } from '@/types';
import { useState } from 'react';

export default function HistoryPage() {
  const { address, isConnected } = useWallet();
  const { stats, history } = usePlayerStats(address);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📊 Stats & History</h1>
        <ConnectWallet />
      </div>

      {!isConnected && (
        <p className="text-gray-500 text-center py-12">Connect your wallet to see stats.</p>
      )}

      {isConnected && stats && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox label="Arenas Played" value={stats.arenasPlayed.toString()} />
            <StatBox
              label="Total P&L"
              value={`${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(4)} ETH`}
              color={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <StatBox label="Best Streak" value={`${stats.bestStreak}x 🔥`} />
            <StatBox
              label="Win Rate"
              value={`${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0)}%`}
            />
          </div>

          {/* Charts */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <WinRateChart wins={stats.wins} losses={stats.losses} />
            </div>
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <PnLChart history={history} />
            </div>
          </div>

          {/* God Streak */}
          <div className="mb-6">
            <GodStreak streak={3} best={stats.bestStreak} />
          </div>

          {/* History Table */}
          <h2 className="text-lg font-bold mb-3">Arena History</h2>
          <div className="space-y-2">
            {history.map((entry) => {
              const tier = TIER_CONFIG[entry.tier];
              const isExpanded = expandedId === entry.arenaId;
              return (
                <div
                  key={entry.arenaId}
                  className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.arenaId)}
                    className="w-full flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${tier.color} font-bold`}>{tier.label}</span>
                      <span className="text-gray-400">#{entry.arenaId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          entry.result === 'win' ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {entry.pnl} ETH
                      </span>
                      <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 text-sm text-gray-400 animate-slide-up">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Entry Fee: {entry.entryFee} ETH</div>
                        <div>Score: {entry.score}</div>
                        <div>Players: {entry.totalPlayers}</div>
                        <div>Result: {entry.result.toUpperCase()}</div>
                        <div className="col-span-2">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function StatBox({
  label,
  value,
  color = 'text-white',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
