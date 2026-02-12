'use client';

import { ConnectWallet } from '@/components/ConnectWallet';
import { ArenaCard, getTierFromIndex } from '@/components/ArenaCard';
import { PredictionPanel } from '@/components/PredictionPanel';
import { PriceChart } from '@/components/PriceChart';
import { TierSelector } from '@/components/TierSelector';
import { PlayerProfileCard } from '@/components/GodStreak';
import { Confetti } from '@/components/Confetti';
import { FireRain } from '@/components/FireRain';
import { ScreenShake } from '@/components/ScreenShake';
import { ArenaCountdown } from '@/components/ArenaCountdown';
import { ShareCardModal } from '@/components/ShareCard';
import { LiveSpectatorBar } from '@/components/LiveSpectatorBar';
import { useMiniBlocks } from '@/hooks/useMiniBlocks';
import { useArenaCount, useArena, useGodStreak } from '@/hooks/useArena';
import { useWallet } from '@/hooks/useWallet';
import { useSwipe } from '@/hooks/useSwipe';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ArenaTier } from '@/types';
import Link from 'next/link';

export default function Home() {
  const { blockNumber } = useMiniBlocks();
  const { data: arenaCount } = useArenaCount();
  const { isConnected, address } = useWallet();
  const { data: godStreak } = useGodStreak(address as `0x${string}` | undefined);
  const [selectedArena, setSelectedArena] = useState<bigint | null>(null);
  const [tierFilter, setTierFilter] = useState<ArenaTier | 'all'>('all');
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [fireRainTrigger, setFireRainTrigger] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [showShare, setShowShare] = useState(false);

  const count = arenaCount ? Number(arenaCount) : 0;
  const arenaIds = useMemo(
    () => Array.from({ length: count }, (_, i) => BigInt(count - 1 - i)),
    [count],
  );

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
  const streak = godStreak ? Number(godStreak) : 0;

  return (
    <ScreenShake trigger={shakeTrigger}>
      <Confetti active={confettiTrigger} />
      <FireRain active={fireRainTrigger} />

      {/* Persistent top bar */}
      <div className="sticky top-0 z-30 glass-card border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold neon-text-purple">⚡ BLOCKARENA</span>
            {streak > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                🔥 {streak}x
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiveSpectatorBar />
            <ConnectWallet />
          </div>
        </div>
        {/* Next arena countdown - always visible */}
        {selectedArena !== null && (
          <SelectedArenaCountdown arenaId={selectedArena} currentBlock={blockNumber} />
        )}
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6" {...swipeHandlers}>
        {/* Daily Challenge Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-sm font-bold text-white">Daily Challenge</div>
              <div className="text-xs text-gray-400">Play 5 arenas for 2x multiplier</div>
            </div>
          </div>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full ${i <= 2 ? 'bg-purple-500' : 'bg-gray-700'}`} />
            ))}
          </div>
        </motion.div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-2 mb-6">
          {[
            { href: '/', icon: '⚡', label: 'Arena', active: true },
            { href: '/history', icon: '📊', label: 'Stats' },
            { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
            { href: '/gallery', icon: '🖼️', label: 'Gallery' },
            { href: '/tournament', icon: '⚔️', label: 'Tournament' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>

        {/* Live Block Counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 glass-card rounded-xl flex justify-between items-center"
        >
          <span className="text-gray-400 text-sm">Current Block</span>
          <span className="font-display text-lg neon-text-green">#{blockNumber.toString()}</span>
        </motion.div>

        {/* Live Price Chart */}
        <AnimatePresence>
          {selectedArena !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <PriceChart arenaId={Number(selectedArena)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card */}
        {isConnected && address && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <PlayerProfileCard address={address} streak={streak} bestStreak={streak} wins={0} losses={0} />
          </motion.div>
        )}

        {/* Tier Filter */}
        <div className="mb-4">
          <TierSelector selected={tierFilter} onSelect={setTierFilter} />
        </div>

        {/* Arena List */}
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-bold font-display text-white/90">LIVE ARENAS</h2>
          {count === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏟️</div>
              <p className="text-gray-500 text-sm">No arenas yet. Deploy the contract and create one!</p>
            </div>
          )}
          <AnimatePresence>
            {arenaIds.map((id, i) => (
              <motion.div
                key={id.toString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <FilteredArenaCard
                  arenaId={id}
                  currentBlock={blockNumber}
                  tierFilter={tierFilter}
                  onClick={() => setSelectedArena(id)}
                  selected={selectedArena === id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Prediction Panel */}
        <AnimatePresence>
          {selectedArena !== null && isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
            >
              <SelectedArenaPrediction
                arenaId={selectedArena}
                currentBlock={blockNumber}
                onWin={() => { setConfettiTrigger(true); setShakeTrigger(s => s+1); setTimeout(() => setConfettiTrigger(false), 100); }}
                onStreak={() => { setFireRainTrigger(true); setTimeout(() => setFireRainTrigger(false), 100); }}
                onShare={() => setShowShare(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Again CTA */}
        {!selectedArena && count > 0 && (
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => arenaIds[0] && setSelectedArena(arenaIds[0])}
            className="w-full py-4 rounded-xl btn-neon-green text-xl font-display tracking-wider mb-6"
          >
            ⚡ PLAY NOW
          </motion.button>
        )}
      </main>

      {/* Share Card Modal */}
      {showShare && (
        <ShareCardModal
          arenaId={selectedArena ? Number(selectedArena) : 0}
          score={142}
          total={150}
          streak={streak}
          predictions={Array.from({length: 10}, () => Math.random() > 0.3)}
          onClose={() => setShowShare(false)}
        />
      )}
    </ScreenShake>
  );
}

function FilteredArenaCard({
  arenaId, currentBlock, tierFilter, onClick, selected,
}: {
  arenaId: bigint; currentBlock: bigint; tierFilter: ArenaTier | 'all'; onClick: () => void; selected: boolean;
}) {
  const { data: arena } = useArena(arenaId);
  if (!arena) return null;
  if (tierFilter !== 'all' && getTierFromIndex(Number(arena.tier)) !== tierFilter) return null;
  return (
    <div onClick={onClick} className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-purple-500/50 rounded-xl' : ''}`}>
      <ArenaCard arenaId={arenaId} currentBlock={currentBlock} />
    </div>
  );
}

function SelectedArenaCountdown({ arenaId, currentBlock }: { arenaId: bigint; currentBlock: bigint }) {
  const { data: arena } = useArena(arenaId);
  if (!arena) return null;
  const startBlock = BigInt(arena.startBlock);
  const endBlock = BigInt(arena.endBlock);
  const isActive = currentBlock >= startBlock && currentBlock <= endBlock;
  const blocksLeft = isActive ? Number(endBlock - currentBlock) : Number(startBlock - currentBlock);
  const isUpcoming = currentBlock < startBlock;

  if (!isActive && !isUpcoming) return null;

  return (
    <div className="px-4 py-1.5 flex items-center justify-center gap-2 text-sm">
      {isUpcoming ? (
        <ArenaCountdown blocksRemaining={blocksLeft} label="NEXT ARENA" />
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold font-display text-xs">LIVE</span>
          <span className="text-gray-400 mx-1">·</span>
          <span className="font-display text-xs neon-text-blue">{blocksLeft} blocks left</span>
        </>
      )}
    </div>
  );
}

function SelectedArenaPrediction({
  arenaId, currentBlock, onWin, onStreak, onShare,
}: {
  arenaId: bigint; currentBlock: bigint; onWin: () => void; onStreak: () => void; onShare: () => void;
}) {
  const { data: arena } = useArena(arenaId);
  if (!arena) return null;
  const startBlock = BigInt(arena.startBlock);
  const endBlock = BigInt(arena.endBlock);
  const isActive = currentBlock >= startBlock && currentBlock <= endBlock;
  const isEnded = currentBlock > endBlock && !arena.finalized;
  const numTicks = Number(endBlock - startBlock);

  return (
    <PredictionPanel
      arenaId={arenaId}
      numTicks={numTicks}
      isActive={isActive}
      isEnded={isEnded}
      onWin={onWin}
      onStreak={onStreak}
      onShare={onShare}
    />
  );
}
