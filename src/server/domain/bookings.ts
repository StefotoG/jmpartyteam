/**
 * Enquiry intake. The availability check and the allocation are two different things:
 * the check produces a friendly answer for the visitor, the exclusion constraint
 * produces the guarantee. Only the second one is authoritative.
 */
import type { Sql } from '../db/client.ts';
import { errorCode, PG_EXCLUSION_VIOLATION, withRetry } from '../db/retry.ts';
import { DEFAULT_HOLD_TTL_SECONDS } from './holds.ts';

export interface EnquiryInput {
  fullName: string;
  phone: string;
  email?: string;
  locale: 'bg' | 'en';
  eventDate: string;
  serviceKey: string;
  city: string;
  guestCount?: number;
  notes?: string;
}

export type EnquiryResult =
  | { ok: true; reference: string }
  | { ok: false; reason: 'unavailable' };

export interface BookingSummary {
  reference: string;
  status: string;
  eventDate: string;
  serviceKey: string;
  city: string;
  guestCount: number | null;
  customerName: string;
  phone: string;
  createdAt: Date;
}

export async function listBookings(sql: Sql, limit = 200): Promise<BookingSummary[]> {
  return sql<BookingSummary[]>`
    SELECT
      b.reference,
      b.status,
      to_char(lower(b.event_window) AT TIME ZONE 'Europe/Sofia', 'DD.MM.YYYY') AS "eventDate",
      b.service_key AS "serviceKey",
      b.city,
      b.guest_count AS "guestCount",
      c.full_name AS "customerName",
      c.phone,
      b.created_at AS "createdAt"
    FROM booking b
    JOIN customer c ON c.id = b.customer_id
    ORDER BY lower(b.event_window)
    LIMIT ${limit}`;
}

/**
 * Deliberately answers only about the one date asked for. Returning a list of free
 * dates would let a competitor scrape the whole calendar, which is why the public
 * availability calendar was removed from the site in the first place.
 */
export async function isDateAvailable(sql: Sql, eventDate: string): Promise<boolean> {
  const [row] = await sql<{ available: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM resource r
      WHERE r.kind = 'dj'
        AND r.active
        AND NOT EXISTS (
          SELECT 1
          FROM booking_resource br
          WHERE br.resource_id = r.id
            AND br.active
            AND NOT (br.state = 'held' AND br.expires_at <= now())
            AND br.slot && default_allocation_slot(${eventDate}::date)
        )
    ) AS available`;

  return row.available;
}

export async function createEnquiry(
  sql: Sql,
  input: EnquiryInput,
  holdTtlSeconds: number = DEFAULT_HOLD_TTL_SECONDS
): Promise<EnquiryResult> {
  try {
    return await withRetry(() =>
      sql.begin(async (tx) => {
        // Serialises everyone competing for this date. Without it, concurrent enquiries
        // deadlock inside the exclusion index and wait out the deadlock detector.
        await tx`SELECT pg_advisory_xact_lock(hashtext(${input.eventDate})::bigint)`;

        // Holds whose deadline has passed are still `active`; retire them before deciding.
        await tx`
          UPDATE booking_resource
          SET active = false
          WHERE active
            AND state = 'held'
            AND expires_at <= now()
            AND slot && default_allocation_slot(${input.eventDate}::date)`;

        const [resource] = await tx<{ id: string }[]>`
          SELECT r.id
          FROM resource r
          WHERE r.kind = 'dj'
            AND r.active
            AND NOT EXISTS (
              SELECT 1
              FROM booking_resource br
              WHERE br.resource_id = r.id
                AND br.active
                AND br.slot && default_allocation_slot(${input.eventDate}::date)
            )
          ORDER BY r.key
          LIMIT 1`;

        if (!resource) return { ok: false, reason: 'unavailable' } as const;

        const [customer] = await tx<{ id: string }[]>`
          INSERT INTO customer (full_name, phone, email, locale, consent_at)
          VALUES (
            ${input.fullName},
            ${input.phone},
            ${input.email ?? null},
            ${input.locale},
            now()
          )
          RETURNING id`;

        const [booking] = await tx<{ id: string; reference: string }[]>`
          INSERT INTO booking (
            customer_id, event_window, service_key, city, guest_count, notes, locale
          )
          VALUES (
            ${customer.id},
            default_event_window(${input.eventDate}::date),
            ${input.serviceKey},
            ${input.city},
            ${input.guestCount ?? null},
            ${input.notes ?? null},
            ${input.locale}
          )
          RETURNING id, reference`;

        await tx`
          INSERT INTO booking_resource (booking_id, resource_id, slot, state, expires_at)
          VALUES (
            ${booking.id},
            ${resource.id},
            default_allocation_slot(${input.eventDate}::date),
            'held',
            now() + make_interval(secs => ${holdTtlSeconds})
          )`;

        return { ok: true, reference: booking.reference } as const;
      })
    );
  } catch (error) {
    if (errorCode(error) === PG_EXCLUSION_VIOLATION) {
      return { ok: false, reason: 'unavailable' };
    }
    throw error;
  }
}
