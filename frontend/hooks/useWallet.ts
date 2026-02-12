'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useCallback } from 'react';

/**
 * Unified wallet hook — abstracts Privy embedded wallet vs injected (MetaMask).
 * When Privy is configured (NEXT_PUBLIC_PRIVY_APP_ID), prefer its embedded wallet.
 * Otherwise fall back to injected connector.
 */
export function useWallet() {
  const { address, isConnected, connector } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const connectInjected = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const login = useCallback(() => {
    // In a full Privy integration you'd call privy.login() here.
    // For now we fall through to injected wallet.
    connectInjected();
  }, [connectInjected]);

  const logout = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return {
    address,
    shortAddress,
    isConnected,
    connector,
    login,
    loginWithInjected: connectInjected,
    logout,
  };
}
