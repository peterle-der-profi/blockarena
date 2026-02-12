'use client';

import { ConnectWallet } from '@/components/ConnectWallet';
import { ArenaCard, getTier } from '@/components/ArenaCard';
import { PredictionPanel } from '@/components/PredictionPanel';
import { TierSelector } from '@/components/TierSelector';
import { ReferralDashboard } from '@/components/ReferralDashboard';
import { PlayerProfileCard } from '@/components/GodStreak';
import { Confetti } from '@/components/Confetti';
import { ScreenShake } from '@/components/ScreenShake';
import { useMiniBlocks } from '@/hooks/useMiniBlocks';
import { useArenaCount, useArena } from '@/hooks/useArena';
import { useWallet } from '@/hooks/useWallet';
import { useSwipe } from '@/hooks/useSwipe';
import { useState, useMemo, useCallback } from 'react';
import type { ArenaTier } from '@/types';
import Link from 'next/link';

export default function Home() {
  const { blockNumber } = useMiniBlocks();
  const { data: arenaCount } = useArenaCount();
  const { isConnected, address } = useWallet();
  const [selectedArena, setSelectedArena] = useState<bigint | null>(null);
  const [tierFilter, setTierFilter] = useState<ArenaTier | 'all'>('all');
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const count = arenaCount ? Number(arenaCount) : 0;
  const arenaIds = useMemo(
    () => Array.from({ length: count }, (_, i) => BigInt(count - 1 - i)),
    [count],
  );

  // Swipe to cycle selected arena
  const swipeToNext = useCallback(() => {
    if (arenaIds.length === 0) return;
    setSelectedArena((prev) => {
      if (prev === null) return arenaIds[0];
      const idx = arenaIds.indexOf(prev);
      return arenaIds[Math.min(idx + 1, arenaIds.length - 1)];
    });
  }, [arenaIds]);

  const swipeToPrev = useCallback(() => {
    if (arenaIds.length === 0) return;
    setSelectedArena((prev) => {
      if (prev === null) return arenaIds[0];
      const idx = arenaIds.indexOf(prev);
      return arenaIds[Math.max(idx - 1, 0)];
    });
  }, [arenaIds]);

  const swipeHandlers = useSwipe(swipeToNext, swipeToPrev);

  return (
    <ScreenShake trigger={shakeTrigger}>
      <Confetti active={confettiTrigger} />
      <main
        className="max-w-4xl mx-auto px-4 py-6 sm:py-8"
        {...swipeHandlers}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">⚡ BlockArena</h1>
            <p className="text-gray-400 text-xs sm:text-sm">Real-time prediction game on MegaETH</p>
          </div>
          <ConnectWallet />
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-4 mb-6 text-sm">
          <Link href="/history" className="text-gray-400 hover:text-white">📊 Stats</Link>
          <Link href="/gallery" className="text-gray-400 hover:text-white">🖼️ Gallery</Link>
          <Link href="/tournament" className="text-gray-400 hover:text-white">🏆 Tournament</Link>
          <Link href="/overlay" className="text-gray-400 hover:text-white">📺 Overlay</Link>
        </div>

        {/* Live Block Counter */}
        <div className="mb-4 p-3 bg-gray-900 rounded-lg flex justify-between items-center">
          <span className="text-gray-400 text-sm">Current Block</span>
          <span className="font-mono text-green-400 text-lg">#{blockNumber.toString()}</span>
        </div>

        {/* Profile Card */}
        {isConnected && address && (
          <div className="mb-4">
            <PlayerProfileCard address={address} streak={3} bestStreak={7} wins={12} losses={8} />
          </div>
        )}

        {/* Tier Filter */}
        <div className="mb-4">
          <TierSelector selected={tierFilter} onSelect={setTierFilter} />
        </div>

        {/* Arena List */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-bold">Arenas</h2>
          {count === 0 && (
            <p className="text-gray-500">No arenas yet. Deploy the contract and create one!</p>
          )}
          {arenaIds.map((id) => (
            <FilteredArenaCard
              key={id.toString()}
              arenaId={id}
              currentBlock={blockNumber}
              tierFilter={tierFilter}
              onClick={() => setSelectedArena(id)}
            />
          ))}
        </div>

        {/* Prediction Panel */}
        {selectedArena !== null && isConnected && (
          <SelectedArenaPrediction arenaId={selectedArena} currentBlock={blockNumber} />
        )}

        {/* Referral */}
        {isConnected && address && (
          <div className="mt-6">
            <ReferralDashboard address={address} />
          </div>
        )}
      </main>
    </ScreenShake>
  );
}

function FilteredArenaCard({
  arenaId,
  currentBlock,
  tierFilter,
  onClick,
}: {
  arenaId: bigint;
  currentBlock: bigint;
  tierFilter: ArenaTier | 'all';
  onClick: () => void;
}) {
  const { data: arena } = useArena(arenaId);
  if (!arena) return null;
  if (tierFilter !== 'all' && getTier(arena.entryFee) !== tierFilter) return null;

  return (
    <div onClick={onClick} className="cursor-pointer">
      <ArenaCard arenaId={arenaId} currentBlock={currentBlock} />
    </div>
  );
}

function SelectedArenaPrediction({ arenaId, currentBlock }: { arenaId: bigint; currentBlock: bigint }) {
  const { data: arena } = useArena(arenaId);
  if (!arena) return null;

  const startBlock = BigInt(arena.startBlock);
  const endBlock = BigInt(arena.endBlock);
  const isActive = currentBlock >= startBlock && currentBlock <= endBlock;
  const isEnded = currentBlock > endBlock && !arena.finalized;
  const numTicks = Number(endBlock - startBlock);

  return (
    <PredictionPanel arenaId={arenaId} numTicks={numTicks} isActive={isActive} isEnded={isEnded} />
  );
}
