import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status as string | undefined;

  let query = 'SELECT * FROM tournaments';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT 50';
  const tournaments = db.prepare(query).all(...params);

  // Parse arena_ids JSON
  const result = (tournaments as any[]).map((t) => ({
    ...t,
    arena_ids: JSON.parse(t.arena_ids),
  }));

  res.json({ tournaments: result });
});

export default router;
