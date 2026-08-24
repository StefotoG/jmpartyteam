/**
 * Applies the plain-SQL migrations in ./migrations in filename order, once each.
 *
 * Hand-written SQL rather than a generator: the exclusion constraint is the substance
 * of this system and needs to be readable, reviewable and quotable as-is.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, type Sql } from './client.ts';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate(sql: Sql): Promise<string[]> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migration (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM schema_migration`).map((r) => r.name)
  );

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`INSERT INTO schema_migration (name) VALUES (${file})`;
    });
    ran.push(file);
  }
  return ran;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = connect();
  try {
    const ran = await migrate(sql);
    console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Already up to date.');
  } finally {
    await sql.end();
  }
}
