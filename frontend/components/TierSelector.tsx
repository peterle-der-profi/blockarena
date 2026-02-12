'use client';

import { TIER_CONFIG, type ArenaTier } from '@/types';
import { motion } from 'framer-motion';

interface TierSelectorProps {
  selected: ArenaTier | 'all';
  onSelect: (tier: ArenaTier | 'all') => void;
}

export function TierSelector({ selected, onSelect }: TierSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <TierButton
        active={selected === 'all'}
        onClick={() => onSelect('all')}
        label="ALL"
        color="text-white"
      />
      {(Object.entries(TIER_CONFIG) as [ArenaTier, (typeof TIER_CONFIG)[ArenaTier]][]).map(
        ([tier, cfg]) => (
          <TierButton
            key={tier}
            active={selected === tier}
            onClick={() => onSelect(tier)}
            label={cfg.label.toUpperCase()}
            color={cfg.color}
          />
        ),
      )}
    </div>
  );
}

function TierButton({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap tracking-wider transition-all ${
        active
          ? `${color} bg-white/10 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]`
          : 'text-gray-600 bg-transparent hover:text-gray-400 hover:bg-white/5'
      }`}
    >
      {label}
    </motion.button>
  );
}
