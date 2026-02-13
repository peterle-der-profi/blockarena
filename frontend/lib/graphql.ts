/**
 * GraphQL client for Envio HyperIndex.
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';

export interface GqlPlayer {
  id: string;
  totalArenas: number;
  totalWins: number;
  totalEarnings: string;
  godStreak: number;
  isFlagged: boolean;
}

export interface GqlArena {
  id: string;
  tier: number;
  playerCount: number;
  isFinalized: boolean;
  startBlock: number;
  endBlock: number;
  totalPot: string;
}

export interface GqlProtocolStats {
  totalArenas: number;
  totalPlayers: number;
  totalVolume: string;
}

async function gqlFetch<T>(query: string): Promise<T | null> {
  if (!GRAPHQL_URL) return null;
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(): Promise<GqlPlayer[]> {
  const data = await gqlFetch<{ Player: GqlPlayer[] }>(`{
    Player(order_by: {totalWins: desc}, limit: 50) {
      id
      totalArenas
      totalWins
      totalEarnings
      godStreak
      isFlagged
    }
  }`);
  return data?.Player ?? [];
}

export async function fetchProtocolStats(): Promise<GqlProtocolStats | null> {
  const data = await gqlFetch<{ ProtocolStats: GqlProtocolStats[] }>(`{
    ProtocolStats {
      totalArenas
      totalPlayers
      totalVolume
    }
  }`);
  return data?.ProtocolStats?.[0] ?? null;
}

export async function fetchIndexedArenas(limit = 20): Promise<GqlArena[]> {
  const data = await gqlFetch<{ Arena: GqlArena[] }>(`{
    Arena(order_by: {id: desc}, limit: ${limit}) {
      id
      tier
      playerCount
      isFinalized
      startBlock
      endBlock
      totalPot
    }
  }`);
  return data?.Arena ?? [];
}
