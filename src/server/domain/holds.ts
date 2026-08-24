/**
 * Holds and their expiry.
 *
 * An expired hold is still `active` until something deactivates it, so every allocation
 * path sweeps the slot it is about to contend for first, inside the same transaction and
 * behind the same advisory lock. `releaseExpired` then exists only to keep the table tidy,
 * not to make expiry correct.
 */
import type { Sql } from '../db/client.ts';

/** Long enough for the DJs to answer an enquiry, short enough that silence frees the date. */
export const DEFAULT_HOLD_TTL_SECONDS = 48 * 60 * 60;

export async function releaseExpiredForSlot(
  sql: Sql,
  eventDate: string
): Promise<number> {
  const rows = await sql`
    UPDATE booking_resource
    SET active = false
    WHERE active
      AND state = 'held'
      AND expires_at <= now()
      AND slot && default_allocation_slot(${eventDate}::date)`;
  return rows.count;
}

/** Sweeper for everything the contended-slot path never touches. */
export async function releaseExpired(sql: Sql): Promise<number> {
  const rows = await sql`
    UPDATE booking_resource
    SET active = false
    WHERE active AND state = 'held' AND expires_at <= now()`;
  return rows.count;
}

export type ConfirmResult = 'confirmed' | 'not_found' | 'expired';

export async function confirmHold(sql: Sql, reference: string): Promise<ConfirmResult> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ state: string; expired: boolean }[]>`
      SELECT br.state, br.expires_at <= now() AS expired
      FROM booking_resource br
      JOIN booking b ON b.id = br.booking_id
      WHERE b.reference = ${reference} AND br.active
      FOR UPDATE OF br`;

    if (!row) return 'not_found';
    if (row.state === 'confirmed') return 'confirmed';
    if (row.expired) return 'expired';

    await tx`
      UPDATE booking_resource br
      SET state = 'confirmed', expires_at = NULL
      FROM booking b
      WHERE b.id = br.booking_id AND b.reference = ${reference} AND br.active`;

    await tx`UPDATE booking SET status = 'confirmed' WHERE reference = ${reference}`;

    return 'confirmed';
  });
}
