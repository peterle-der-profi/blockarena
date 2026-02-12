import { config } from './config';
import { getDb } from './db/database';
import { EventIndexer } from './services/indexer';

async function main() {
  getDb();
  console.log('[Indexer Standalone] DB initialized');

  const indexer = new EventIndexer();
  await indexer.start();

  process.on('SIGINT', () => {
    indexer.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    indexer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
