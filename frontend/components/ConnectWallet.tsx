'use client';

import { useWallet } from '@/hooks/useWallet';
import { motion } from 'framer-motion';

export function ConnectWallet() {
  const { shortAddress, isConnected, login, loginWithInjected, logout } = useWallet();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 neon-text-green text-[11px]">
          {shortAddress}
        </span>
        <button
          onClick={logout}
          className="px-2.5 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-full border border-red-500/20 transition-all"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={login}
        className="px-4 py-2 rounded-full font-bold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
      >
        Connect
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={loginWithInjected}
        className="w-9 h-9 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition-all"
        title="MetaMask"
      >
        🦊
      </motion.button>
    </div>
  );
}
