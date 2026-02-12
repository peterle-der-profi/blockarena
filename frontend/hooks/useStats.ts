'use client';

import { useState, useEffect } from 'react';
import type { PlayerStats, ArenaHistoryEntry, ArenaTier } from '@/types';

const STATS_KEY = 'blockarena-stats';
const HISTORY_KEY = 'blockarena-history';

function generateMockStats(): PlayerStats {
  return { wins: 12, losses: 8, totalPnL: 0.45, bestStreak: 7, arenasPlayed: 20 };
}

function generateMockHistory(): ArenaHistoryEntry[] {
  const tiers: ArenaTier[] = ['low', 'mid', 'high', 'vip'];
  return Array.from({ length: 15 }, (_, i) => ({
    arenaId: 100 - i,
    tier: tiers[i % 4],
    entryFee: ['0.005', '0.05', '0.5', '2'][i % 4],
    result: (i % 3 === 0 ? 'win' : 'loss') as 'win' | 'loss',
    pnl: i % 3 === 0 ? `+${(Math.random() * 0.5).toFixed(4)}` : `-${['0.005', '0.05', '0.5', '2'][i % 4]}`,
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
    const storedStats = localStorage.getItem(`${STATS_KEY}-${address}`);
    const storedHistory = localStorage.getItem(`${HISTORY_KEY}-${address}`);
    setStats(storedStats ? JSON.parse(storedStats) : generateMockStats());
    setHistory(storedHistory ? JSON.parse(storedHistory) : generateMockHistory());
  }, [address]);

  return { stats, history };
}
