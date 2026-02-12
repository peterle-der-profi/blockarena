/**
 * Backend API client for BlockArena.
 * Falls back gracefully when backend is unavailable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export interface ApiArena {
  id: number;
  tier: number; // 0=Low, 1=Mid, 2=High, 3=VIP
  startBlock: number;
  endBlock: number;
  pot: string;
  playerCount: number;
  finalized: boolean;
  players: string[];
  tournamentId: number;
}

export interface ApiPlayerStats {
  address: string;
  wins: number;
  losses: number;
  totalPnL: string;
  bestStreak: number;
  currentStreak: number;
  arenasPlayed: number;
}

export interface ApiLeaderboardEntry {
  address: string;
  wins: number;
  streak: number;
  totalPnL: string;
}

export interface ApiPriceUpdate {
  type: 'price';
  arenaId: number;
  block: number;
  price: string;
}

export interface ApiArenaUpdate {
  type: 'arena';
  arenaId: number;
  event: string;
  data: Record<string, unknown>;
}

type WsMessage = ApiPriceUpdate | ApiArenaUpdate;

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchArenas(): Promise<ApiArena[]> {
  return (await apiFetch<ApiArena[]>('/arenas')) ?? [];
}

export async function fetchArena(id: number): Promise<ApiArena | null> {
  return apiFetch<ApiArena>(`/arenas/${id}`);
}

export async function fetchPlayerStats(address: string): Promise<ApiPlayerStats | null> {
  return apiFetch<ApiPlayerStats>(`/players/${address}`);
}

export async function fetchLeaderboard(): Promise<ApiLeaderboardEntry[]> {
  return (await apiFetch<ApiLeaderboardEntry[]>('/leaderboard')) ?? [];
}

/** Connect to WebSocket for live updates */
export function connectWebSocket(
  onMessage: (msg: WsMessage) => void,
  onError?: () => void,
): () => void {
  let ws: WebSocket | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        try {
          onMessage(JSON.parse(e.data));
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        onError?.();
        ws?.close();
      };
    } catch {
      if (!closed) setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    closed = true;
    ws?.close();
  };
}
