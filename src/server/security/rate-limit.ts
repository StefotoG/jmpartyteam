/**
 * Fixed-window rate limiting, counted in PostgreSQL so the limit holds across serverless
 * instances rather than per process.
 */
import type { Sql } from '../db/client.ts';

export interface Quota {
  limit: number;
  windowSeconds: number;
}

export interface Decision {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
}

/** Availability is a yes/no oracle about one date, so it is the enumeration surface. */
export const AVAILABILITY_QUOTA: Quota = { limit: 30, windowSeconds: 60 };

/** Enquiries are cheap to send and expensive to receive, so they are held much tighter. */
export const ENQUIRY_QUOTA: Quota = { limit: 5, windowSeconds: 600 };

export async function consume(sql: Sql, bucket: string, quota: Quota): Promise<Decision> {
  const [row] = await sql<{ hits: number; windowStart: Date }[]>`
    INSERT INTO rate_limit (bucket, window_start, hits)
    VALUES (
      ${bucket},
      to_timestamp(
        floor(extract(epoch FROM now()) / ${quota.windowSeconds}) * ${quota.windowSeconds}
      ),
      1
    )
    ON CONFLICT (bucket, window_start)
      DO UPDATE SET hits = rate_limit.hits + 1
    RETURNING hits, window_start AS "windowStart"`;

  const elapsed = (Date.now() - row.windowStart.getTime()) / 1000;

  return {
    allowed: row.hits <= quota.limit,
    hits: row.hits,
    retryAfterSeconds: Math.max(1, Math.ceil(quota.windowSeconds - elapsed)),
  };
}

/** Windows older than a day can never be current again. */
export async function purgeExpired(sql: Sql): Promise<number> {
  const rows = await sql`DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'`;
  return rows.count;
}
