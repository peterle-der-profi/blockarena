'use client';

import { useArena, useEntryFee, useJoinArena } from '@/hooks/useArena';
import { formatEther } from 'viem';
import { TIER_CONFIG, TIER_FROM_INDEX, type ArenaTier } from '@/types';
import { CountdownTimer } from './CountdownTimer';
import { motion } from 'framer-motion';

interface ArenaCardProps {
  arenaId: bigint;
  currentBlock: bigint;
}

export function getTierFromIndex(tierIndex: number): ArenaTier {
  return TIER_FROM_INDEX[tierIndex] ?? 'low';
}

const NEON_TIER: Record<ArenaTier, { gradient: string; glow: string; border: string }> = {
  low: { gradient: 'from-green-900/30 to-green-900/10', glow: 'shadow-[0_0_15px_rgba(57,255,20,0.15)]', border: 'border-green-500/30' },
  mid: { gradient: 'from-blue-900/30 to-blue-900/10', glow: 'shadow-[0_0_15px_rgba(0,212,255,0.15)]', border: 'border-blue-500/30' },
  high: { gradient: 'from-purple-900/30 to-purple-900/10', glow: 'shadow-[0_0_15px_rgba(191,0,255,0.15)]', border: 'border-purple-500/30' },
  vip: { gradient: 'from-yellow-900/30 to-yellow-900/10', glow: 'shadow-[0_0_15px_rgba(255,215,0,0.2)]', border: 'border-yellow-500/30' },
};

export function ArenaCard({ arenaId, currentBlock }: ArenaCardProps) {
  const { data: arena } = useArena(arenaId);
  const tierIndex = arena ? Number(arena.tier) : 0;
  const { data: entryFee } = useEntryFee(tierIndex);

  if (!arena) {
    return <div className="h-32 rounded-xl skeleton" />;
  }

  const startBlock = BigInt(arena.startBlock);
  const endBlock = BigInt(arena.endBlock);
  const isJoinable = currentBlock < startBlock;
  const isActive = currentBlock >= startBlock && currentBlock <= endBlock;
  const isEnded = currentBlock > endBlock;
  const tier = getTierFromIndex(tierIndex);
  const cfg = TIER_CONFIG[tier];
  const neon = NEON_TIER[tier];
  const fee = entryFee ?? 0n;

  const totalBlocks = Number(endBlock - startBlock);
  const blocksRemaining = isActive ? Number(endBlock - currentBlock) : 0;

  return (
    <div className={`border ${neon.border} rounded-xl p-4 bg-gradient-to-br ${neon.gradient} ${neon.glow} transition-all hover:scale-[1.01] backdrop-blur-sm`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-white">#{arenaId.toString()}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} uppercase tracking-wider`}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          <span className={`text-xs font-bold ${isActive ? 'text-red-400' : isEnded ? 'text-gray-500' : 'text-green-400'}`}>
            {arena.finalized ? '🏆 DONE' : isEnded ? '⏳ REVEAL' : isActive ? 'LIVE' : 'OPEN'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div className="text-center">
          <div className="text-gray-500 text-[10px] uppercase">Entry</div>
          <div className="font-display text-sm font-bold text-white">{fee > 0n ? formatEther(fee) : cfg.fee}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-[10px] uppercase">Pot</div>
          <div className="font-display text-sm font-bold neon-text-gold">{formatEther(arena.pot)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-[10px] uppercase">Players</div>
          <div className="font-display text-sm font-bold text-white">{arena.playerCount.toString()}</div>
        </div>
      </div>

      {isActive && (
        <div className="mb-3">
          <CountdownTimer blocksRemaining={blocksRemaining} totalBlocks={totalBlocks} />
        </div>
      )}

      {isJoinable && <JoinButton arenaId={arenaId} fee={fee} tier={tier} cfgFee={cfg.fee} />}

      {isActive && (
        <div className="text-center py-1">
          <span className="font-display text-xs neon-text-red animate-neon-pulse font-bold tracking-widest">
            🔴 LIVE — {blocksRemaining} BLOCKS
          </span>
        </div>
      )}
    </div>
  );
}

function JoinButton({ arenaId, fee, tier, cfgFee }: { arenaId: bigint; fee: bigint; tier: ArenaTier; cfgFee: string }) {
  const joinArena = useJoinArena();
  const displayFee = fee > 0n ? formatEther(fee) : cfgFee;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={(e) => { e.stopPropagation(); joinArena(arenaId, fee); }}
      className={`w-full py-3 rounded-xl font-display font-bold text-base tracking-wider active:scale-95 transition-all ${
        tier === 'vip' ? 'btn-neon-green' : 'btn-neon-green'
      }`}
    >
      ⚡ JOIN ({displayFee} ETH)
    </motion.button>
  );
}

export { getTierFromIndex as getTier };
