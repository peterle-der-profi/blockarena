'use client';

import { useState } from 'react';
import { HighlightNFTCard } from '@/components/HighlightNFTCard';
import { ConnectWallet } from '@/components/ConnectWallet';
import { motion } from 'framer-motion';
import type { HighlightNFT, ArenaTier } from '@/types';

const MOCK_NFTS: HighlightNFT[] = Array.from({ length: 12 }, (_, i) => ({
  tokenId: i + 1,
  arenaId: 100 - i,
  owner: `0x${(i + 1).toString(16).padStart(40, 'a')}`,
  score: 150 + Math.floor(Math.random() * 100),
  godStreak: Math.floor(Math.random() * 15) + 3,
  timestamp: Date.now() - i * 86400_000,
  imageUrl: '',
  tier: (['low', 'mid', 'high', 'vip'] as ArenaTier[])[i % 4],
}));

export default function GalleryPage() {
  const [nfts] = useState<HighlightNFT[]>(MOCK_NFTS);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold neon-text-gold">🖼️ HIGHLIGHTS</h1>
        <ConnectWallet />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {nfts.map((nft, i) => (
          <motion.div
            key={nft.tokenId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <HighlightNFTCard nft={nft} />
          </motion.div>
        ))}
      </div>

      {nfts.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-gray-600">No highlight NFTs minted yet</p>
        </div>
      )}
    </main>
  );
}
