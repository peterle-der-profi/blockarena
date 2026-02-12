'use client';

import { useState } from 'react';
import { TIER_CONFIG, type HighlightNFT } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const NEON_TIER_GRAD: Record<string, string> = {
  low: 'from-green-900/60 to-green-950/40',
  mid: 'from-blue-900/60 to-blue-950/40',
  high: 'from-purple-900/60 to-purple-950/40',
  vip: 'from-yellow-900/60 to-yellow-950/40',
};

export function HighlightNFTCard({ nft }: { nft: HighlightNFT }) {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CONFIG[nft.tier];

  const handleShare = async () => {
    const text = `🏆 BlockArena Highlight #${nft.tokenId} — Arena #${nft.arenaId}, Score: ${nft.score}, God Streak: ${nft.godStreak}x 🔥`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(true)}
        className={`cursor-pointer rounded-xl border border-white/5 bg-gradient-to-br ${NEON_TIER_GRAD[nft.tier]} glass-card p-3 transition-all`}
      >
        <div className="aspect-square bg-gradient-to-br from-gray-900 to-black rounded-lg mb-2 flex items-center justify-center text-4xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="relative z-10">🏆</span>
          <div className={`absolute bottom-1 right-1 text-[8px] font-display font-bold px-1.5 py-0.5 rounded ${tier.bg} ${tier.color}`}>
            {tier.label}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-display font-bold ${tier.color}`}>#{nft.tokenId}</span>
          <span className="text-[10px] text-gray-600">Arena #{nft.arenaId}</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-1 font-display">
          {nft.score}pts · {nft.godStreak}x 🔥
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`max-w-md w-full rounded-2xl glass-card border border-white/10 p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-square bg-gradient-to-br from-gray-900 to-black rounded-xl mb-4 flex items-center justify-center text-7xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(191,0,255,0.1),transparent_70%)]" />
                <span className="relative animate-celebration">🏆</span>
              </div>
              <h3 className="font-display text-xl font-bold mb-3 neon-text-gold">Highlight #{nft.tokenId}</h3>
              <div className="space-y-1.5 text-sm text-gray-400 mb-4">
                <div className="flex justify-between"><span>Arena</span><span className="text-white">#{nft.arenaId}</span></div>
                <div className="flex justify-between"><span>Score</span><span className="font-display text-white">{nft.score}</span></div>
                <div className="flex justify-between"><span>God Streak</span><span className="neon-text-gold font-display">{nft.godStreak}x 🔥</span></div>
                <div className="flex justify-between"><span>Tier</span><span className={tier.color}>{tier.label}</span></div>
                <div className="flex justify-between"><span>Owner</span><span className="font-mono text-xs">{nft.owner.slice(0, 8)}...{nft.owner.slice(-4)}</span></div>
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleShare} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-sm">📤 Share</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExpanded(false)} className="flex-1 py-2.5 rounded-xl glass-card border border-white/10 text-sm">Close</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
