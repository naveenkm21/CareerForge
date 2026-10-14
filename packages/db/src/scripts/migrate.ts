import { fileURLToPath } from 'node:url';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateLite } from 'drizzle-orm/pglite/migrator';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { closeDb, databaseKind, getDb } from '../client';

async function main() {
  // Local default: the embedded database the web app also uses (see .env.example).
  process.env.DATABASE_URL ??= 'pglite:.data/pg';
  const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
  const db = getDb();
  if (databaseKind() === 'pglite')
    await migrateLite(db as unknown as PgliteDatabase, { migrationsFolder });
  else await migratePg(db, { migrationsFolder });
  console.log(`migrations applied (${databaseKind()})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    // Drizzle wraps driver errors; the real reason (auth, network, SQL) is in `cause`.
    if (err instanceof Error && err.cause)
      console.error('cause:', (err.cause as Error).message ?? err.cause);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
