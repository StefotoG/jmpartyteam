/**
 * Covers the intake path end to end at the domain level: availability, allocation
 * across several resources, and the local-time semantics of an event window.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connect, TEST_DATABASE_URL, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import { createEnquiry, isDateAvailable, type EnquiryInput } from '../../src/server/domain/bookings.ts';

const SUMMER_DATE = '2026-06-20';
const WINTER_DATE = '2026-11-21';

let sql: Sql;

function enquiry(overrides: Partial<EnquiryInput> = {}): EnquiryInput {
  return {
    fullName: 'Мария Петрова',
    phone: '+359888123456',
    email: 'maria@example.com',
    locale: 'bg',
    eventDate: SUMMER_DATE,
    serviceKey: 'weddings',
    city: 'София',
    guestCount: 120,
    ...overrides,
  };
}

async function addDjs(count: number) {
  for (let i = 1; i <= count; i++) {
    await sql`
      INSERT INTO resource (key, kind, label)
      VALUES (${`dj-${i}`}, 'dj', ${sql.json({ bg: `DJ ${i}`, en: `DJ ${i}` })})`;
  }
}

beforeAll(async () => {
  sql = connect(TEST_DATABASE_URL);
  await migrate(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE booking_resource, booking, customer, resource RESTART IDENTITY CASCADE`;
  // Not owned by a column, so TRUNCATE ... RESTART IDENTITY does not touch it.
  await sql`ALTER SEQUENCE booking_reference_seq RESTART`;
});

describe('enquiry intake', () => {
  it('reports a free date as available', async () => {
    await addDjs(1);
    expect(await isDateAvailable(sql, SUMMER_DATE)).toBe(true);
  });

  it('reports no availability when the business has no active resources', async () => {
    expect(await isDateAvailable(sql, SUMMER_DATE)).toBe(false);
  });

  it('creates a booking and returns a human-readable reference', async () => {
    await addDjs(1);

    const result = await createEnquiry(sql, enquiry());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reference).toMatch(/^JM-\d{4}-\d{4,}$/);
    expect(await isDateAvailable(sql, SUMMER_DATE)).toBe(false);
  });

  it('refuses a second enquiry for a date the only DJ is already booked on', async () => {
    await addDjs(1);
    await createEnquiry(sql, enquiry());

    expect(await createEnquiry(sql, enquiry({ fullName: 'Ivan' }))).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('accepts two events on one night when two DJs are available', async () => {
    await addDjs(2);

    expect((await createEnquiry(sql, enquiry())).ok).toBe(true);
    expect((await createEnquiry(sql, enquiry({ fullName: 'Ivan' }))).ok).toBe(true);
    expect(await isDateAvailable(sql, SUMMER_DATE)).toBe(false);
  });

  it('keeps neighbouring dates free', async () => {
    await addDjs(1);
    await createEnquiry(sql, enquiry());

    expect(await isDateAvailable(sql, '2026-06-21')).toBe(true);
  });

  it('keeps references unique past the four-digit padding boundary', async () => {
    await addDjs(1);
    await sql`SELECT setval('booking_reference_seq', 9999)`;

    const references = await sql<{ reference: string }[]>`
      SELECT next_booking_reference() AS reference FROM generate_series(1, 3)`;

    expect(references.map((r) => r.reference.split('-')[2])).toEqual([
      '10000',
      '10001',
      '10002',
    ]);
    expect(new Set(references.map((r) => r.reference)).size).toBe(3);
  });

  it('starts every event at 18:00 local time on both sides of the DST change', async () => {
    const [row] = await sql<{ summer: string; winter: string }[]>`
      SELECT
        to_char(lower(default_event_window(${SUMMER_DATE}::date)) AT TIME ZONE 'Europe/Sofia',
                'HH24:MI') AS summer,
        to_char(lower(default_event_window(${WINTER_DATE}::date)) AT TIME ZONE 'Europe/Sofia',
                'HH24:MI') AS winter`;

    expect(row).toEqual({ summer: '18:00', winter: '18:00' });
  });

  it('blocks the resource for longer than the event itself', async () => {
    const [row] = await sql<{ event: string; slot: string }[]>`
      SELECT
        (upper(default_event_window(${SUMMER_DATE}::date))
          - lower(default_event_window(${SUMMER_DATE}::date)))::text AS event,
        (upper(default_allocation_slot(${SUMMER_DATE}::date))
          - lower(default_allocation_slot(${SUMMER_DATE}::date)))::text AS slot`;

    expect(row.event).toBe('09:00:00');
    expect(row.slot).toBe('12:00:00');
  });
});
