import { ethers } from 'ethers';
import { config } from '../config';
import { getDb } from '../db/database';
import { ARENA_ENGINE_ABI } from '../types';
import { broadcast } from '../utils/broadcast';

export class EventIndexer {
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private running = false;

  async start() {
    if (!config.arenaEngineAddress || !config.wsUrl) {
      console.warn('[Indexer] Missing contract address or WS URL, skipping');
      return;
    }

    console.log('[Indexer] Starting event indexer...');
    this.running = true;
    await this.connect();
  }

  stop() {
    this.running = false;
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    console.log('[Indexer] Stopped');
  }

  private async connect() {
    try {
      this.provider = new ethers.WebSocketProvider(config.wsUrl);
      this.contract = new ethers.Contract(
        config.arenaEngineAddress,
        ARENA_ENGINE_ABI,
        this.provider
      );

      this.attachListeners();
      await this.backfillEvents();
      console.log('[Indexer] Connected and listening');
    } catch (err) {
      console.error('[Indexer] Connection failed:', err);
      if (this.running) {
        setTimeout(() => this.connect(), 5000);
      }
    }
  }

  private attachListeners() {
    if (!this.contract) return;

    this.contract.on('ArenaCreated', (arenaId, tier, entryFee, startBlock, endBlock, assetPair, event) => {
      this.handleArenaCreated(arenaId, tier, entryFee, startBlock, endBlock, assetPair, event);
    });

    this.contract.on('PlayerJoined', (arenaId, player, event) => {
      this.handlePlayerJoined(arenaId, player, event);
    });

    this.contract.on('PredictionCommitted', (arenaId, player, commitHash, event) => {
      this.handlePredictionCommitted(arenaId, player, commitHash, event);
    });

    this.contract.on('PredictionRevealed', (arenaId, player, prediction, event) => {
      this.handlePredictionRevealed(arenaId, player, prediction, event);
    });

    this.contract.on('ArenaFinalized', (arenaId, finalPrice, event) => {
      this.handleArenaFinalized(arenaId, finalPrice, event);
    });

    this.contract.on('GodStreakUpdate', (player, streak, event) => {
      this.handleGodStreakUpdate(player, streak, event);
    });

    this.contract.on('PotDistributed', (arenaId, winner, amount, event) => {
      this.handlePotDistributed(arenaId, winner, amount, event);
    });
  }

  private async backfillEvents() {
    const db = getDb();
    const row = db.prepare("SELECT value FROM indexer_state WHERE key = 'last_block'").get() as { value: string } | undefined;
    const fromBlock = row ? parseInt(row.value) + 1 : 0;

    if (!this.provider || !this.contract) return;

    const currentBlock = await this.provider.getBlockNumber();
    if (fromBlock >= currentBlock) return;

    console.log(`[Indexer] Backfilling from block ${fromBlock} to ${currentBlock}`);

    const events = await this.contract.queryFilter('*' as any, fromBlock, currentBlock);
    for (const event of events) {
      const log = event as ethers.EventLog;
      if (!log.fragment) continue;
      const name = log.fragment.name;
      const args = log.args;

      switch (name) {
        case 'ArenaCreated':
          this.handleArenaCreated(args[0], args[1], args[2], args[3], args[4], args[5], log);
          break;
        case 'PlayerJoined':
          this.handlePlayerJoined(args[0], args[1], log);
          break;
        case 'PredictionCommitted':
          this.handlePredictionCommitted(args[0], args[1], args[2], log);
          break;
        case 'PredictionRevealed':
          this.handlePredictionRevealed(args[0], args[1], args[2], log);
          break;
        case 'ArenaFinalized':
          this.handleArenaFinalized(args[0], args[1], log);
          break;
        case 'GodStreakUpdate':
          this.handleGodStreakUpdate(args[0], args[1], log);
          break;
        case 'PotDistributed':
          this.handlePotDistributed(args[0], args[1], args[2], log);
          break;
      }
    }

    this.saveLastBlock(currentBlock);
  }

  private handleArenaCreated(arenaId: bigint, tier: number, entryFee: bigint, startBlock: bigint, endBlock: bigint, assetPair: string, _event: any) {
    const db = getDb();
    const id = arenaId.toString();
    const durationSec = Number(endBlock - startBlock); // approximate

    db.prepare(`
      INSERT OR IGNORE INTO arenas (arena_id, tier, entry_fee, duration_sec, start_block, end_block, status, asset_pair, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(id, tier, entryFee.toString(), durationSec, Number(startBlock), Number(endBlock), assetPair, _event?.transactionHash || '');

    console.log(`[Indexer] ArenaCreated #${id}`);
    broadcast({ type: 'arena:created', data: { arenaId: id, tier, entryFee: entryFee.toString(), assetPair } });
  }

  private handlePlayerJoined(arenaId: bigint, player: string, _event: any) {
    const db = getDb();
    const id = arenaId.toString();
    const addr = player.toLowerCase();

    db.prepare(`INSERT OR IGNORE INTO players (arena_id, address) VALUES (?, ?)`).run(id, addr);
    db.prepare(`
      INSERT INTO player_stats (address, total_arenas) VALUES (?, 1)
      ON CONFLICT(address) DO UPDATE SET total_arenas = total_arenas + 1
    `).run(addr);

    console.log(`[Indexer] PlayerJoined #${id} ${addr}`);
    broadcast({ type: 'arena:player_joined', data: { arenaId: id, player: addr } });
  }

  private handlePredictionCommitted(arenaId: bigint, player: string, commitHash: string, _event: any) {
    const db = getDb();
    db.prepare(`UPDATE players SET commitment_hash = ? WHERE arena_id = ? AND address = ?`)
      .run(commitHash, arenaId.toString(), player.toLowerCase());

    broadcast({ type: 'arena:prediction_committed', data: { arenaId: arenaId.toString(), player: player.toLowerCase() } });
  }

  private handlePredictionRevealed(arenaId: bigint, player: string, prediction: number, _event: any) {
    const db = getDb();
    db.prepare(`UPDATE players SET prediction = ?, revealed = 1 WHERE arena_id = ? AND address = ?`)
      .run(prediction, arenaId.toString(), player.toLowerCase());

    broadcast({ type: 'arena:prediction_revealed', data: { arenaId: arenaId.toString(), player: player.toLowerCase(), prediction } });
  }

  private handleArenaFinalized(arenaId: bigint, finalPrice: bigint, _event: any) {
    const db = getDb();
    db.prepare(`UPDATE arenas SET status = 'finalized', finalized_at = datetime('now') WHERE arena_id = ?`)
      .run(arenaId.toString());

    console.log(`[Indexer] ArenaFinalized #${arenaId.toString()}`);
    broadcast({ type: 'arena:finalized', data: { arenaId: arenaId.toString(), finalPrice: finalPrice.toString() } });
  }

  private handleGodStreakUpdate(player: string, streak: bigint, _event: any) {
    const db = getDb();
    const addr = player.toLowerCase();
    const s = Number(streak);

    db.prepare(`
      INSERT INTO player_stats (address, god_streak) VALUES (?, ?)
      ON CONFLICT(address) DO UPDATE SET god_streak = MAX(god_streak, ?)
    `).run(addr, s, s);

    broadcast({ type: 'player:god_streak', data: { player: addr, streak: s } });
  }

  private handlePotDistributed(arenaId: bigint, winner: string, amount: bigint, _event: any) {
    const db = getDb();
    const id = arenaId.toString();
    const addr = winner.toLowerCase();

    db.prepare(`UPDATE players SET payout = ? WHERE arena_id = ? AND address = ?`)
      .run(amount.toString(), id, addr);

    db.prepare(`
      INSERT INTO player_stats (address, wins, total_pnl) VALUES (?, 1, ?)
      ON CONFLICT(address) DO UPDATE SET
        wins = wins + 1,
        total_pnl = CAST((CAST(total_pnl AS REAL) + CAST(? AS REAL)) AS TEXT),
        current_streak = current_streak + 1,
        best_streak = MAX(best_streak, current_streak + 1)
    `).run(addr, amount.toString(), amount.toString());

    broadcast({ type: 'arena:pot_distributed', data: { arenaId: id, winner: addr, amount: amount.toString() } });
  }

  private saveLastBlock(block: number) {
    const db = getDb();
    db.prepare(`INSERT OR REPLACE INTO indexer_state (key, value) VALUES ('last_block', ?)`).run(block.toString());
  }
}
