import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/:address', (req, res) => {
  const db = getDb();
  const addr = req.params.address.toLowerCase();

  const referrals = db.prepare('SELECT * FROM referrals WHERE referrer = ? ORDER BY id DESC LIMIT 100').all(addr);
  const totalReward = db.prepare('SELECT COALESCE(SUM(CAST(reward AS REAL)), 0) as total FROM referrals WHERE referrer = ?').get(addr) as { total: number };
  const count = db.prepare('SELECT COUNT(DISTINCT referee) as count FROM referrals WHERE referrer = ?').get(addr) as { count: number };

  res.json({
    address: addr,
    total_referrals: count.count,
    total_reward: totalReward.total.toString(),
    referrals,
  });
});

export default router;
