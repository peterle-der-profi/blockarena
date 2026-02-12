import { http, createConfig } from 'wagmi';
import { megaethTestnet } from './chains';

export const config = createConfig({
  chains: [megaethTestnet],
  transports: {
    [megaethTestnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
