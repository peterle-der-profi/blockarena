import { ethers } from 'ethers';
import { config } from '../config';
import { getDb } from '../db/database';
import { ARENA_ENGINE_ABI } from '../types';
import { PriceOracle } from './price-oracle';

const TIERS = [0, 1, 2]; // rotate through tiers

export class ArenaManager {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private priceOracle: PriceOracle;
  private createInterval: ReturnType<typeof setInterval> | null = null;
  private finalizeInterval: ReturnType<typeof setInterval> | null = null;
  private tierIndex = 0;

  constructor(priceOracle: PriceOracle) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, {
      chainId: config.chainId,
      name: 'megaeth',
    });
    this.wallet = new ethers.Wallet(config.operatorPrivateKey, this.provider);
    this.contract = new ethers.Contract(config.arenaEngineAddress, ARENA_ENGINE_ABI, this.wallet);
    this.priceOracle = priceOracle;
  }

  start() {
    if (!config.arenaEngineAddress || !config.operatorPrivateKey) {
      console.warn('[ArenaManager] Missing config, skipping auto-management');
      return;
    }

    console.log('[ArenaManager] Starting...');

    // Create arenas on schedule
    this.createInterval = setInterval(() => this.createArena(), config.arenaIntervalSec * 1000);

    // Check for arenas to finalize every 5 seconds
    this.finalizeInterval = setInterval(() => this.checkFinalize(), 5000);
  }

  stop() {
    if (this.createInterval) clearInterval(this.createInterval);
    if (this.finalizeInterval) clearInterval(this.finalizeInterval);
  }

  private async createArena() {
    try {
      const tier = TIERS[this.tierIndex % TIERS.length];
      this.tierIndex++;

      const entryFees = [ethers.parseEther('0.001'), ethers.parseEther('0.01'), ethers.parseEther('0.1')];
      const entryFee = entryFees[tier] || entryFees[0];

      const currentBlock = await this.provider.getBlockNumber();
      // MegaETH has ~10ms blocks, so durationBlocks ≈ durationSec * 100
      const durationBlocks = config.arenaDefaultDurationSec * 100;

      const tx = await this.contract.createArena(tier, entryFee, durationBlocks, 'ETH/USD');
      const receipt = await tx.wait();
      console.log(`[ArenaManager] Created arena tier=${tier} tx=${receipt?.hash}`);
    } catch (err) {
      console.error('[ArenaManager] Failed to create arena:', err);
    }
  }

  private async checkFinalize() {
    try {
      const db = getDb();
      const currentBlock = await this.provider.getBlockNumber();

      // Find arenas past their end_block + reveal period
      const revealBlocks = config.revealPeriodSec * 100;
      const arenas = db.prepare(`
        SELECT arena_id, start_block, end_block, asset_pair FROM arenas
        WHERE status IN ('active', 'revealing') AND end_block + ? < ?
      `).all(revealBlocks, currentBlock) as Array<{ arena_id: string; start_block: number; end_block: number; asset_pair: string }>;

      for (const arena of arenas) {
        await this.finalizeArena(arena);
      }
    } catch (err) {
      console.error('[ArenaManager] Finalize check error:', err);
    }
  }

  private async finalizeArena(arena: { arena_id: string; start_block: number; end_block: number; asset_pair: string }) {
    try {
      const db = getDb();

      // Get player list (backend is source of truth)
      const players = db.prepare(`SELECT address FROM players WHERE arena_id = ?`)
        .all(arena.arena_id) as Array<{ address: string }>;
      const playerAddresses = players.map((p) => p.address);

      if (playerAddresses.length === 0) {
        // No players, just mark as finalized
        db.prepare(`UPDATE arenas SET status = 'finalized', finalized_at = datetime('now') WHERE arena_id = ?`)
          .run(arena.arena_id);
        return;
      }

      // Build and submit price tape
      try {
        const tape = await this.priceOracle.buildPriceTape(arena.asset_pair, arena.start_block, arena.end_block);
        if (tape.length > 0) {
          const tapeTx = await this.contract.submitPriceTape(arena.arena_id, tape);
          await tapeTx.wait();
          console.log(`[ArenaManager] Submitted price tape for arena #${arena.arena_id}`);
        }
      } catch (err) {
        console.error(`[ArenaManager] Price tape submission failed for #${arena.arena_id}:`, err);
      }

      // Finalize with player list
      const tx = await this.contract.finalizeArena(arena.arena_id, playerAddresses);
      await tx.wait();
      console.log(`[ArenaManager] Finalized arena #${arena.arena_id} with ${playerAddresses.length} players`);
    } catch (err) {
      console.error(`[ArenaManager] Failed to finalize arena #${arena.arena_id}:`, err);
    }
  }
}
