'use client';

import { useState } from 'react';
import { HighlightNFTCard } from '@/components/HighlightNFTCard';
import { ConnectWallet } from '@/components/ConnectWallet';
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
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🖼️ Highlight NFTs</h1>
        <ConnectWallet />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {nfts.map((nft) => (
          <HighlightNFTCard key={nft.tokenId} nft={nft} />
        ))}
      </div>

      {nfts.length === 0 && (
        <p className="text-gray-500 text-center py-12">No highlight NFTs minted yet.</p>
      )}
    </main>
  );
}
