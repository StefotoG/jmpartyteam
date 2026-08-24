/**
 * Two ways to allocate a resource to a booking. The difference between them is the
 * subject of the concurrency experiment: `allocateNaive` asks the database whether the
 * slot is free and then writes, which is unsound because the answer can go stale before
 * the write lands; `allocateGuarded` writes unconditionally and lets the exclusion
 * constraint arbitrate.
 */
import type { Sql } from '../db/client.ts';
import { errorCode, PG_EXCLUSION_VIOLATION, withRetry } from '../db/retry.ts';

export interface Slot {
  start: Date;
  end: Date;
}

export interface AllocationInput {
  bookingId: string;
  resourceId: string;
  slot: Slot;
}

export type AllocationResult = { ok: true } | { ok: false; reason: 'unavailable' };

export interface AllocationHooks {
  /**
   * Awaited between the availability check and the insert. The experiment uses it to
   * hold every worker at the same point, which turns the race from intermittent into
   * reproducible without changing what the code under test does.
   */
  afterCheck?: () => Promise<void>;
}

export async function allocateNaive(
  sql: Sql,
  input: AllocationInput,
  hooks: AllocationHooks = {}
): Promise<AllocationResult> {
  return sql.begin(async (tx) => {
    const [conflict] = await tx`
      SELECT 1
      FROM booking_resource
      WHERE resource_id = ${input.resourceId}
        AND active
        AND slot && tstzrange(${input.slot.start}, ${input.slot.end}, '[)')
      LIMIT 1`;

    if (conflict) return { ok: false, reason: 'unavailable' } as const;

    await hooks.afterCheck?.();

    await tx`
      INSERT INTO booking_resource (booking_id, resource_id, slot)
      VALUES (
        ${input.bookingId},
        ${input.resourceId},
        tstzrange(${input.slot.start}, ${input.slot.end}, '[)')
      )`;

    return { ok: true } as const;
  });
}

export async function allocateGuarded(
  sql: Sql,
  input: AllocationInput
): Promise<AllocationResult> {
  try {
    await withRetry(
      () => sql`
        INSERT INTO booking_resource (booking_id, resource_id, slot)
        VALUES (
          ${input.bookingId},
          ${input.resourceId},
          tstzrange(${input.slot.start}, ${input.slot.end}, '[)')
        )`
    );
    return { ok: true };
  } catch (error) {
    if (errorCode(error) === PG_EXCLUSION_VIOLATION) {
      return { ok: false, reason: 'unavailable' };
    }
    throw error;
  }
}

/**
 * Third strategy: queue on an advisory lock keyed by the contended resource before
 * touching the index at all. Contenders then arrive one at a time, so the loser gets a
 * plain constraint violation instead of waiting out PostgreSQL's deadlock detector.
 */
export async function allocateSerialized(
  sql: Sql,
  input: AllocationInput
): Promise<AllocationResult> {
  try {
    return await withRetry(() =>
      sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${input.resourceId})::bigint)`;

        await tx`
          INSERT INTO booking_resource (booking_id, resource_id, slot)
          VALUES (
            ${input.bookingId},
            ${input.resourceId},
            tstzrange(${input.slot.start}, ${input.slot.end}, '[)')
          )`;

        return { ok: true } as const;
      })
    );
  } catch (error) {
    if (errorCode(error) === PG_EXCLUSION_VIOLATION) {
      return { ok: false, reason: 'unavailable' };
    }
    throw error;
  }
}

/** Counts allocations that overlap the slot — the invariant must never let this exceed 1. */export async function countOverlapping(
  sql: Sql,
  resourceId: string,
  slot: Slot
): Promise<number> {
  const [row] = await sql<{ count: string }[]>`
    SELECT count(*) AS count
    FROM booking_resource
    WHERE resource_id = ${resourceId}
      AND active
      AND slot && tstzrange(${slot.start}, ${slot.end}, '[)')`;
  return Number(row.count);
}
