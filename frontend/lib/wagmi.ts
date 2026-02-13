import { http, createConfig } from 'wagmi';
import { megaethTestnet } from './chains';

export const config = createConfig({
  chains: [megaethTestnet],
  transports: {
    [megaethTestnet.id]: http(),
  },
  // Disable auto-reconnect to prevent Rabby/MetaMask from hijacking Privy
  syncConnectedChain: false,
  multiInjectedProviderDiscovery: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
