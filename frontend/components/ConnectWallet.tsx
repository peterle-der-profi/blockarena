'use client';

import { useWallet } from '@/hooks/useWallet';

export function ConnectWallet() {
  const { shortAddress, isConnected, login, loginWithInjected, logout } = useWallet();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-green-400">{shortAddress}</span>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={login}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm"
      >
        Login
      </button>
      <button
        onClick={loginWithInjected}
        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        title="Connect MetaMask"
      >
        🦊
      </button>
    </div>
  );
}
