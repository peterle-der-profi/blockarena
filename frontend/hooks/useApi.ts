'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchArenas,
  fetchArena,
  fetchPlayerStats,
  fetchLeaderboard,
  connectWebSocket,
  type ApiArena,
  type ApiPlayerStats,
  type ApiLeaderboardEntry,
  type ApiPriceUpdate,
} from '@/lib/api';

/** Fetch arena list from backend API */
export function useApiArenas() {
  const [arenas, setArenas] = useState<ApiArena[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchArenas();
    setArenas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { arenas, loading, refresh };
}

/** Fetch single arena from backend API */
export function useApiArena(id: number) {
  const [arena, setArena] = useState<ApiArena | null>(null);

  useEffect(() => {
    fetchArena(id).then(setArena);
  }, [id]);

  return arena;
}

/** Fetch player stats from backend API */
export function useApiPlayerStats(address?: string) {
  const [stats, setStats] = useState<ApiPlayerStats | null>(null);

  useEffect(() => {
    if (!address) return;
    fetchPlayerStats(address).then(setStats);
  }, [address]);

  return stats;
}

/** Fetch leaderboard from backend API */
export function useApiLeaderboard() {
  const [entries, setEntries] = useState<ApiLeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard().then(setEntries);
  }, []);

  return entries;
}

/** Subscribe to live price updates via WebSocket */
export function useLivePrices(arenaId?: number) {
  const [prices, setPrices] = useState<{ block: number; price: string }[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const cleanup = connectWebSocket(
      (msg) => {
        if (msg.type === 'price' && (arenaId === undefined || msg.arenaId === arenaId)) {
          setPrices((prev) => [...prev.slice(-499), { block: (msg as ApiPriceUpdate).block, price: (msg as ApiPriceUpdate).price }]);
        }
      },
      () => setConnected(false),
    );
    setConnected(true);
    return cleanup;
  }, [arenaId]);

  return { prices, connected };
}
