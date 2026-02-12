import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const sortBy = (req.query.sort as string) || 'wins';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const validSorts: Record<string, string> = {
    wins: 'wins DESC',
    pnl: 'CAST(total_pnl AS REAL) DESC',
    streak: 'best_streak DESC',
    arenas: 'total_arenas DESC',
  };

  const orderBy = validSorts[sortBy] || validSorts.wins;

  const rows = db.prepare(`
    SELECT address, total_arenas, wins, losses, total_pnl, current_streak, best_streak, god_streak,
           CASE WHEN total_arenas > 0 THEN ROUND(wins * 100.0 / total_arenas, 1) ELSE 0 END as win_rate
    FROM player_stats
    WHERE total_arenas > 0
    ORDER BY ${orderBy}
    LIMIT ?
  `).all(limit);

  res.json({ leaderboard: rows });
});

export default router;
