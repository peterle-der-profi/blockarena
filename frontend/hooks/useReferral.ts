'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReferralData } from '@/types';

const REFERRAL_KEY = 'blockarena-referral';

export function useReferral(userAddress?: string) {
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);

  // Capture ref from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref !== userAddress) {
      localStorage.setItem(`${REFERRAL_KEY}-by`, ref);
      setReferredBy(ref);
    } else {
      setReferredBy(localStorage.getItem(`${REFERRAL_KEY}-by`));
    }
  }, [userAddress]);

  // Load mock referral data
  useEffect(() => {
    if (!userAddress) return;
    const stored = localStorage.getItem(`${REFERRAL_KEY}-${userAddress}`);
    if (stored) {
      setReferralData(JSON.parse(stored));
    } else {
      setReferralData({
        code: userAddress,
        totalReferrals: 0,
        totalEarnings: '0',
        referrals: [],
      });
    }
  }, [userAddress]);

  const referralLink = userAddress
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${userAddress}`
    : '';

  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return false;
    try {
      await navigator.clipboard.writeText(referralLink);
      return true;
    } catch {
      return false;
    }
  }, [referralLink]);

  return { referredBy, referralData, referralLink, copyReferralLink };
}
