'use client';

import { useWallet } from '@/hooks/useWallet';

export function ConnectWallet() {
  const { shortAddress, isConnected, isLoading, login, loginWithInjected, logout, isPrivy } = useWallet();

  if (isLoading) {
    return <div className="px-3 py-1.5 rounded text-xs text-neutral-600">Loading...</div>;
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs px-2 py-1 rounded bg-[#161616] text-green-500 border border-[#222]">
          {shortAddress}
        </span>
        <button
          onClick={logout}
          className="px-2 py-1 text-xs text-neutral-500 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={login}
        className="px-4 py-1.5 rounded text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-colors"
      >
        CONNECT
      </button>
      {!isPrivy && (
        <button
          onClick={loginWithInjected}
          className="px-2 py-1.5 rounded text-xs border border-[#222] hover:bg-[#161616] transition-colors"
          title="MetaMask"
        >
          🦊
        </button>
      )}
    </div>
  );
}
