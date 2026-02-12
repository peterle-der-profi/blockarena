'use client';

import { useReferral } from '@/hooks/useReferral';
import { useState } from 'react';
import { motion } from 'framer-motion';

export function ReferralDashboard({ address }: { address?: string }) {
  const { referralData, referralLink, copyReferralLink } = useReferral(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyReferralLink();
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (!address || !referralData) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-purple-500/10">
      <h3 className="font-display text-lg font-bold mb-3 text-white">🔗 REFERRALS</h3>
      <div className="flex gap-2 mb-4">
        <input
          readOnly
          value={referralLink}
          className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 truncate border border-white/5"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            copied ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600/50'
          }`}
        >
          {copied ? '✅' : '📋'}
        </motion.button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="font-display text-2xl font-bold text-white">{referralData.totalReferrals}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-widest font-display">REFERRALS</div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="font-display text-2xl font-bold neon-text-green">{referralData.totalEarnings} ETH</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-widest font-display">EARNINGS</div>
        </div>
      </div>
    </div>
  );
}
