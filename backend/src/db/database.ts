import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../blockarena.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS arenas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arena_id TEXT UNIQUE NOT NULL,
      tier INTEGER NOT NULL DEFAULT 0,
      entry_fee TEXT NOT NULL DEFAULT '0',
      duration_sec INTEGER NOT NULL,
      start_block INTEGER NOT NULL DEFAULT 0,
      end_block INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'upcoming',
      asset_pair TEXT NOT NULL DEFAULT 'ETH/USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finalized_at TEXT,
      tx_hash TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arena_id TEXT NOT NULL,
      address TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      commitment_hash TEXT,
      prediction INTEGER,
      revealed INTEGER NOT NULL DEFAULT 0,
      score REAL,
      payout TEXT,
      UNIQUE(arena_id, address),
      FOREIGN KEY (arena_id) REFERENCES arenas(arena_id)
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      address TEXT PRIMARY KEY,
      total_arenas INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_pnl TEXT NOT NULL DEFAULT '0',
      current_streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      god_streak INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer TEXT NOT NULL,
      referee TEXT NOT NULL,
      arena_id TEXT NOT NULL,
      reward TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      arena_ids TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_players_arena ON players(arena_id);
    CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
    CREATE INDEX IF NOT EXISTS idx_arenas_status ON arenas(status);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer);
  `);
}
