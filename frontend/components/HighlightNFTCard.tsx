'use client';

import { useState } from 'react';
import { TIER_CONFIG, type HighlightNFT } from '@/types';

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
      <div
        onClick={() => setExpanded(true)}
        className={`cursor-pointer rounded-xl border ${tier.border} ${tier.bg} p-3 transition-transform hover:scale-[1.02]`}
      >
        <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-2 flex items-center justify-center text-4xl">
          🏆
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-bold ${tier.color}`}>#{nft.tokenId}</span>
          <span className="text-xs text-gray-400">Arena #{nft.arenaId}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Score: {nft.score} · Streak: {nft.godStreak}x 🔥
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className={`max-w-md w-full rounded-2xl border ${tier.border} ${tier.bg} p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-4 flex items-center justify-center text-6xl">
              🏆
            </div>
            <h3 className="text-xl font-bold mb-2">Highlight #{nft.tokenId}</h3>
            <div className="space-y-1 text-sm text-gray-300 mb-4">
              <div>Arena: #{nft.arenaId}</div>
              <div>Score: {nft.score}</div>
              <div>God Streak: {nft.godStreak}x 🔥</div>
              <div>
                Tier: <span className={tier.color}>{tier.label}</span>
              </div>
              <div>
                Owner: {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
              </div>
              <div>Minted: {new Date(nft.timestamp).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm"
              >
                📤 Share
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
