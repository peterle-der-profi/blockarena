import { ethers } from 'ethers';
import { config } from '../config';
import { REDSTONE_PRICE_FEED_ABI } from '../types';
import { broadcast } from '../utils/broadcast';

// RedStone data feed IDs (bytes32)
const DATA_FEED_IDS: Record<string, string> = {
  'ETH/USD': ethers.id('ETH'),
  'BTC/USD': ethers.id('BTC'),
};

export class PriceOracle {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, {
      chainId: config.chainId,
      name: 'megaeth',
    });
  }

  start() {
    if (!config.redStonePriceFeedAddress) {
      console.warn('[PriceOracle] No price feed address configured, skipping');
      return;
    }

    this.contract = new ethers.Contract(
      config.redStonePriceFeedAddress,
      REDSTONE_PRICE_FEED_ABI,
      this.provider
    );

    // Poll price every second for live feed relay
    this.interval = setInterval(() => this.pollPrice(), 1000);
    console.log('[PriceOracle] Started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async pollPrice() {
    if (!this.contract) return;
    try {
      const feedId = DATA_FEED_IDS['ETH/USD'];
      const [price, timestamp] = await this.contract.getLatestPrice(feedId);
      broadcast({
        type: 'price:update',
        data: { pair: 'ETH/USD', price: price.toString(), timestamp: Number(timestamp) },
      });
    } catch {
      // silently skip poll failures
    }
  }

  /**
   * Build a bit-packed uint256[] price tape for an arena's block range.
   * Each price is stored as a 32-bit value. 8 prices per uint256 word.
   */
  async buildPriceTape(assetPair: string, startBlock: number, endBlock: number): Promise<bigint[]> {
    if (!this.contract) throw new Error('Price oracle not initialized');

    const feedId = DATA_FEED_IDS[assetPair];
    if (!feedId) throw new Error(`Unknown asset pair: ${assetPair}`);

    const prices: number[] = [];

    for (let block = startBlock; block <= endBlock; block++) {
      try {
        const price = await this.contract.getPriceAtBlock(feedId, block);
        // Normalize to 32-bit (price in cents or a scaled representation)
        prices.push(Number(price) & 0xFFFFFFFF);
      } catch {
        prices.push(0);
      }
    }

    // Pack 8 prices per uint256
    const words: bigint[] = [];
    for (let i = 0; i < prices.length; i += 8) {
      let word = 0n;
      for (let j = 0; j < 8 && i + j < prices.length; j++) {
        word |= BigInt(prices[i + j]) << BigInt(j * 32);
      }
      words.push(word);
    }

    return words;
  }
}
