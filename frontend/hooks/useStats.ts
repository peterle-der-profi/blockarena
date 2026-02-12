'use client';

import { useState, useEffect } from 'react';
import { fetchPlayerStats } from '@/lib/api';
import type { PlayerStats, ArenaHistoryEntry, ArenaTier } from '@/types';

const STATS_KEY = 'blockarena-stats';
const HISTORY_KEY = 'blockarena-history';

function generateMockHistory(): ArenaHistoryEntry[] {
  const tiers: ArenaTier[] = ['low', 'mid', 'high', 'vip'];
  return Array.from({ length: 15 }, (_, i) => ({
    arenaId: 100 - i,
    tier: tiers[i % 4],
    entryFee: ['0.001', '0.01', '0.1', '1'][i % 4],
    result: (i % 3 === 0 ? 'win' : 'loss') as 'win' | 'loss',
    pnl: i % 3 === 0 ? `+${(Math.random() * 0.5).toFixed(4)}` : `-${['0.001', '0.01', '0.1', '1'][i % 4]}`,
    score: Math.floor(Math.random() * 200) + 50,
    totalPlayers: Math.floor(Math.random() * 8) + 2,
    timestamp: Date.now() - i * 3600_000,
  }));
}

export function usePlayerStats(address?: string) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [history, setHistory] = useState<ArenaHistoryEntry[]>([]);

  useEffect(() => {
    if (!address) return;

    // Try backend API first, fall back to localStorage/mock
    fetchPlayerStats(address).then((apiStats) => {
      if (apiStats) {
        setStats({
          wins: apiStats.wins,
          losses: apiStats.losses,
          totalPnL: parseFloat(apiStats.totalPnL),
          bestStreak: apiStats.bestStreak,
          arenasPlayed: apiStats.arenasPlayed,
        });
      } else {
        // Fallback to localStorage
        const storedStats = localStorage.getItem(`${STATS_KEY}-${address}`);
        setStats(storedStats ? JSON.parse(storedStats) : { wins: 0, losses: 0, totalPnL: 0, bestStreak: 0, arenasPlayed: 0 });
      }
    });

    const storedHistory = localStorage.getItem(`${HISTORY_KEY}-${address}`);
    setHistory(storedHistory ? JSON.parse(storedHistory) : generateMockHistory());
  }, [address]);

  return { stats, history };
}
