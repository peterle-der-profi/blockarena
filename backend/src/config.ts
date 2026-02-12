import dotenv from 'dotenv';
dotenv.config();

export const config = {
  operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY || '',
  arenaEngineAddress: process.env.ARENA_ENGINE_ADDRESS || '',
  redStonePriceFeedAddress: process.env.REDSTONE_PRICE_FEED_ADDRESS || '',
  rpcUrl: process.env.RPC_URL || 'https://carrot.megaeth.com/rpc',
  wsUrl: process.env.WS_URL || 'wss://carrot.megaeth.com/ws',
  chainId: parseInt(process.env.CHAIN_ID || '6343'),
  port: parseInt(process.env.PORT || '3000'),
  wsPort: parseInt(process.env.WS_PORT || '3001'),
  arenaIntervalSec: parseInt(process.env.ARENA_INTERVAL_SEC || '30'),
  arenaDefaultDurationSec: parseInt(process.env.ARENA_DEFAULT_DURATION_SEC || '60'),
  revealPeriodSec: parseInt(process.env.REVEAL_PERIOD_SEC || '30'),
};
