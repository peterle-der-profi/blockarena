// ============================================================
// BlockArena — Shared TypeScript types (V3)
// ============================================================

/* ---------- Arena ---------- */
export type ArenaTier = 'low' | 'mid' | 'high' | 'vip';

/** Maps contract Tier enum (0-3) to ArenaTier string */
export const TIER_FROM_INDEX: ArenaTier[] = ['low', 'mid', 'high', 'vip'];

/** Entry fees per tier in ETH */
export const TIER_FEES: Record<ArenaTier, string> = {
  low: '0.001',
  mid: '0.01',
  high: '0.1',
  vip: '1',
};

export interface ArenaData {
  startBlock: bigint;
  endBlock: bigint;
  pot: bigint;
  playerCount: number;
  tier: number; // 0=Low, 1=Mid, 2=High, 3=VIP
  finalized: boolean;
  tournamentId: bigint;
}

export interface PlayerState {
  commitHash: `0x${string}`;
  revealed: boolean;
  score: number;
}

export const TIER_CONFIG: Record<
  ArenaTier,
  { label: string; color: string; bg: string; border: string; fee: string }
> = {
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-900/40', border: 'border-green-600', fee: '0.001' },
  mid: { label: 'Mid', color: 'text-blue-400', bg: 'bg-blue-900/40', border: 'border-blue-600', fee: '0.01' },
  high: { label: 'High', color: 'text-purple-400', bg: 'bg-purple-900/40', border: 'border-purple-600', fee: '0.1' },
  vip: { label: 'VIP', color: 'text-yellow-400', bg: 'bg-yellow-900/40', border: 'border-yellow-500', fee: '1' },
};

/* ---------- Streaks ---------- */
export interface StreakInfo {
  current: number;
  best: number;
  milestone: number;
}

/* ---------- Player Stats ---------- */
export interface PlayerStats {
  wins: number;
  losses: number;
  totalPnL: number;
  bestStreak: number;
  arenasPlayed: number;
}

export interface ArenaHistoryEntry {
  arenaId: number;
  tier: ArenaTier;
  entryFee: string;
  result: 'win' | 'loss' | 'pending';
  pnl: string;
  score: number;
  totalPlayers: number;
  timestamp: number;
}

/* ---------- Referral ---------- */
export interface ReferralData {
  code: string;
  totalReferrals: number;
  totalEarnings: string;
  referrals: { address: string; date: number; earnings: string }[];
}

/* ---------- Tournament ---------- */
export type TournamentStatus = 'upcoming' | 'qualifying' | 'active' | 'completed';

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: string | null;
  player2: string | null;
  winner: string | null;
  score1?: number;
  score2?: number;
}

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  rounds: number;
  matches: TournamentMatch[];
  prizePool: string;
  participants: number;
  maxParticipants: number;
}

/* ---------- Highlight NFT ---------- */
export interface HighlightNFT {
  tokenId: number;
  arenaId: number;
  owner: string;
  score: number;
  godStreak: number;
  timestamp: number;
  imageUrl: string;
  tier: ArenaTier;
}

/* ---------- Overlay ---------- */
export interface OverlayData {
  currentArena: { id: number; tier: ArenaTier; pot: string; blocksLeft: number } | null;
  leaderboard: { address: string; score: number; streak: number }[];
  predictions: { address: string; direction: 'up' | 'down' }[];
  streaks: { address: string; streak: number }[];
}
