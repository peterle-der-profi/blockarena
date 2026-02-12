'use client';

import { TIER_CONFIG, type ArenaTier } from '@/types';

interface TierSelectorProps {
  selected: ArenaTier | 'all';
  onSelect: (tier: ArenaTier | 'all') => void;
}

export function TierSelector({ selected, onSelect }: TierSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect('all')}
        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
          selected === 'all'
            ? 'bg-white text-black'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        All Tiers
      </button>
      {(Object.entries(TIER_CONFIG) as [ArenaTier, (typeof TIER_CONFIG)[ArenaTier]][]).map(
        ([tier, cfg]) => (
          <button
            key={tier}
            onClick={() => onSelect(tier)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              selected === tier
                ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cfg.label}
          </button>
        ),
      )}
    </div>
  );
}
