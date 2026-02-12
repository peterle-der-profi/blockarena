'use client';

import { useReferral } from '@/hooks/useReferral';
import { useState } from 'react';

export function ReferralDashboard({ address }: { address?: string }) {
  const { referralData, referralLink, copyReferralLink } = useReferral(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyReferralLink();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!address || !referralData) return null;

  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
      <h3 className="text-lg font-bold mb-3">🔗 Referrals</h3>

      <div className="flex gap-2 mb-4">
        <input
          readOnly
          value={referralLink}
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm font-mono text-gray-300 truncate"
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold whitespace-nowrap"
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold">{referralData.totalReferrals}</div>
          <div className="text-xs text-gray-400">Referrals</div>
        </div>
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{referralData.totalEarnings} ETH</div>
          <div className="text-xs text-gray-400">Earnings</div>
        </div>
      </div>

      {referralData.referrals.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-bold text-gray-400">Recent</div>
          {referralData.referrals.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300">
              <span className="font-mono">{r.address.slice(0, 8)}...</span>
              <span className="text-green-400">+{r.earnings} ETH</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
