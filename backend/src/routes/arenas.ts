import { Router } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status as string | undefined;

  let query = 'SELECT * FROM arenas';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT 100';
  const arenas = db.prepare(query).all(...params);
  res.json({ arenas });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const arena = db.prepare('SELECT * FROM arenas WHERE arena_id = ?').get(req.params.id);

  if (!arena) {
    res.status(404).json({ error: 'Arena not found' });
    return;
  }

  const players = db.prepare('SELECT * FROM players WHERE arena_id = ? ORDER BY score DESC').all(req.params.id);

  res.json({ arena, players });
});

export default router;
