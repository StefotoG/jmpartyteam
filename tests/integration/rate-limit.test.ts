import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connect, TEST_DATABASE_URL, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import { consume, purgeExpired } from '../../src/server/security/rate-limit.ts';

const QUOTA = { limit: 3, windowSeconds: 60 };

let sql: Sql;

beforeAll(async () => {
  sql = connect(TEST_DATABASE_URL);
  await migrate(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE rate_limit`;
});

describe('rate limiting', () => {
  it('allows requests up to the limit and refuses the next one', async () => {
    const outcomes: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      outcomes.push((await consume(sql, 'ip:1.2.3.4', QUOTA)).allowed);
    }

    expect(outcomes).toEqual([true, true, true, false, false]);
  });

  it('counts each bucket separately', async () => {
    for (let i = 0; i < 4; i++) await consume(sql, 'ip:1.2.3.4', QUOTA);

    expect((await consume(sql, 'ip:5.6.7.8', QUOTA)).allowed).toBe(true);
  });

  it('holds the limit when requests arrive concurrently', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consume(sql, 'ip:9.9.9.9', QUOTA))
    );

    expect(results.filter((r) => r.allowed)).toHaveLength(QUOTA.limit);
  });

  it('reports how long to wait', async () => {
    const decision = await consume(sql, 'ip:1.1.1.1', QUOTA);

    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(QUOTA.windowSeconds);
  });

  it('starts a fresh allowance in a new window', async () => {
    for (let i = 0; i < 4; i++) await consume(sql, 'ip:2.2.2.2', QUOTA);

    // Rewriting the stored window is equivalent to time passing, without waiting for it.
    await sql`
      UPDATE rate_limit
      SET window_start = window_start - make_interval(secs => ${QUOTA.windowSeconds})
      WHERE bucket = 'ip:2.2.2.2'`;

    expect((await consume(sql, 'ip:2.2.2.2', QUOTA)).allowed).toBe(true);
  });

  it('purges windows that can never be current again', async () => {
    await consume(sql, 'ip:3.3.3.3', QUOTA);
    await sql`UPDATE rate_limit SET window_start = now() - interval '2 days'`;

    expect(await purgeExpired(sql)).toBe(1);
    expect(await sql`SELECT 1 FROM rate_limit`).toHaveLength(0);
  });
});
