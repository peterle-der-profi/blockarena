import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/:address', (req, res) => {
  const db = getDb();
  const addr = req.params.address.toLowerCase();

  const stats = db.prepare('SELECT * FROM player_stats WHERE address = ?').get(addr);
  if (!stats) {
    res.json({
      address: addr,
      stats: { total_arenas: 0, wins: 0, losses: 0, total_pnl: '0', current_streak: 0, best_streak: 0, god_streak: 0 },
      history: [],
    });
    return;
  }

  const history = db.prepare(`
    SELECT p.*, a.tier, a.asset_pair, a.status as arena_status, a.created_at as arena_created
    FROM players p JOIN arenas a ON p.arena_id = a.arena_id
    WHERE p.address = ? ORDER BY a.id DESC LIMIT 50
  `).all(addr);

  const winRate = (stats as any).total_arenas > 0
    ? ((stats as any).wins / (stats as any).total_arenas * 100).toFixed(1)
    : '0';

  res.json({ address: addr, stats: { ...(stats as any), win_rate: winRate }, history });
});

export default router;
