'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWallet } from '@/components/ConnectWallet';
import { fetchLeaderboard, fetchProtocolStats, type GqlPlayer, type GqlProtocolStats } from '@/lib/graphql';
import { formatEther } from 'viem';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<GqlPlayer[]>([]);
  const [stats, setStats] = useState<GqlProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useWallet();

  useEffect(() => {
    Promise.all([fetchLeaderboard(), fetchProtocolStats()]).then(([p, s]) => {
      setPlayers(p);
      setStats(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-neutral-500 hover:text-white text-xs transition-colors">← BACK</Link>
            <span className="text-sm font-bold text-white">LEADERBOARD</span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Protocol Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'TOTAL ARENAS', value: stats.totalArenas.toString() },
              { label: 'PLAYERS', value: stats.totalPlayers.toString() },
              { label: 'VOLUME', value: `${formatEther(BigInt(stats.totalVolume))} ETH` },
            ].map((s) => (
              <div key={s.label} className="border border-[#222] rounded-lg p-3 bg-[#111] text-center">
                <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-sm font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table header */}
        <div className="flex items-center justify-between px-3 py-2 text-[10px] text-neutral-600 uppercase tracking-wider border-b border-[#222]">
          <div className="flex items-center gap-3">
            <span className="w-8">#</span>
            <span>ADDRESS</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="w-12 text-right">STREAK</span>
            <span className="w-12 text-right">WINS</span>
            <span className="w-16 text-right">ARENAS</span>
            <span className="w-24 text-right">EARNINGS</span>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-neutral-600 text-sm">Loading...</div>
        )}

        {!loading && players.length === 0 && (
          <div className="text-center py-16 text-neutral-600 text-sm">No players yet. Be the first!</div>
        )}

        {/* Rows */}
        {players.map((player, i) => {
          const isYou = address?.toLowerCase() === player.id.toLowerCase();
          const earnings = BigInt(player.totalEarnings);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-3 py-2.5 text-xs border-b border-[#161616] ${
                isYou ? 'bg-[#161616]' : 'hover:bg-[#111]'
              } transition-colors`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 font-bold ${i < 3 ? 'text-white' : 'text-neutral-600'}`}>
                  {i + 1}
                </span>
                <span className="text-neutral-400">
                  {player.id.slice(0, 6)}...{player.id.slice(-4)}
                  {isYou && <span className="ml-2 text-white text-[10px]">(YOU)</span>}
                  {player.isFlagged && <span className="ml-2 text-red-500 text-[10px]">⚠</span>}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-12 text-right text-neutral-500">
                  {player.godStreak > 0 ? `${player.godStreak}x` : '-'}
                </span>
                <span className="w-12 text-right text-white font-bold">{player.totalWins}</span>
                <span className="w-16 text-right text-neutral-500">{player.totalArenas}</span>
                <span className={`w-24 text-right font-bold ${earnings > 0n ? 'text-green-500' : 'text-neutral-500'}`}>
                  {earnings > 0n ? `+${formatEther(earnings)}` : '0'} ETH
                </span>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
