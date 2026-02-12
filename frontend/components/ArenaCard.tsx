'use client';

import { useArena, useJoinArena } from '@/hooks/useArena';
import { formatEther } from 'viem';
import { TIER_CONFIG, type ArenaTier } from '@/types';
import { CountdownTimer } from './CountdownTimer';

interface ArenaCardProps {
  arenaId: bigint;
  currentBlock: bigint;
}

function getTier(entryFee: bigint): ArenaTier {
  const eth = parseFloat(formatEther(entryFee));
  if (eth >= 1) return 'vip';
  if (eth >= 0.1) return 'high';
  if (eth >= 0.01) return 'mid';
  return 'low';
}

export function ArenaCard({ arenaId, currentBlock }: ArenaCardProps) {
  const { data: arena } = useArena(arenaId);
  const joinArena = useJoinArena();

  if (!arena) return null;

  const startBlock = BigInt(arena.startBlock);
  const endBlock = BigInt(arena.endBlock);
  const isJoinable = currentBlock < startBlock;
  const isActive = currentBlock >= startBlock && currentBlock <= endBlock;
  const isEnded = currentBlock > endBlock;
  const tier = getTier(arena.entryFee);
  const cfg = TIER_CONFIG[tier];

  const status = arena.finalized
    ? '🏆 Finalized'
    : isEnded
    ? '⏳ Awaiting Reveal'
    : isActive
    ? '🔴 LIVE'
    : '🟢 Open';

  const totalBlocks = Number(endBlock - startBlock);
  const blocksRemaining = isActive ? Number(endBlock - currentBlock) : 0;

  return (
    <div className={`border ${cfg.border} rounded-xl p-4 ${cfg.bg} transition-all hover:scale-[1.01]`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">Arena #{arenaId.toString()}</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            {cfg.label}
          </span>
        </div>
        <span className="text-sm">{status}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
        <div>Entry: {formatEther(arena.entryFee)} ETH</div>
        <div>Pot: {formatEther(arena.pot)} ETH</div>
        <div>Players: {arena.playerCount}</div>
        <div>Blocks: {totalBlocks}</div>
      </div>

      {isActive && (
        <div className="mb-3">
          <CountdownTimer blocksRemaining={blocksRemaining} totalBlocks={totalBlocks} label="Arena Progress" />
        </div>
      )}

      {isJoinable && (
        <button
          onClick={(e) => { e.stopPropagation(); joinArena(arenaId, arena.entryFee); }}
          className={`w-full py-3 rounded-lg font-bold text-lg active:scale-95 transition-transform ${
            tier === 'vip'
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Join ({formatEther(arena.entryFee)} ETH)
        </button>
      )}

      {isActive && (
        <div className="text-center text-yellow-400 font-bold animate-pulse">
          🔴 LIVE — {blocksRemaining} blocks remaining
        </div>
      )}
    </div>
  );
}

export { getTier };
