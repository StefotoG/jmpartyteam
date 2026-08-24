/**
 * Holds exist so that an unanswered enquiry does not block a date for ever. These tests use
 * a one-second TTL rather than the production 48 hours: what matters is the ordering of
 * events, not the absolute duration.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connect, TEST_DATABASE_URL, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import { createEnquiry, isDateAvailable, type EnquiryInput } from '../../src/server/domain/bookings.ts';
import { confirmHold, releaseExpired } from '../../src/server/domain/holds.ts';

const EVENT_DATE = '2027-08-14';

let sql: Sql;

function enquiry(overrides: Partial<EnquiryInput> = {}): EnquiryInput {
  return {
    fullName: 'Мария Петрова',
    phone: '+359888123456',
    locale: 'bg',
    eventDate: EVENT_DATE,
    serviceKey: 'weddings',
    city: 'София',
    ...overrides,
  };
}

/** Moves a hold's deadline into the past instead of waiting for it to pass. */
async function expireHolds() {
  await sql`
    UPDATE booking_resource
    SET expires_at = now() - interval '1 second'
    WHERE state = 'held' AND active`;
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
  await sql`ALTER SEQUENCE booking_reference_seq RESTART`;
  await sql`
    INSERT INTO resource (key, kind, label)
    VALUES ('dj-1', 'dj', ${sql.json({ bg: 'DJ 1', en: 'DJ 1' })})`;
});

describe('holds', () => {
  it('records an enquiry as a hold with a deadline', async () => {
    await createEnquiry(sql, enquiry());

    const [row] = await sql<{ state: string; hasDeadline: boolean }[]>`
      SELECT state, expires_at IS NOT NULL AS "hasDeadline" FROM booking_resource`;

    expect(row).toEqual({ state: 'held', hasDeadline: true });
  });

  it('blocks the date while the hold is alive', async () => {
    await createEnquiry(sql, enquiry());

    expect(await isDateAvailable(sql, EVENT_DATE)).toBe(false);
  });

  it('frees the date once the hold has expired', async () => {
    await createEnquiry(sql, enquiry());
    await expireHolds();

    expect(await isDateAvailable(sql, EVENT_DATE)).toBe(true);
  });

  it('lets another client take a date whose hold lapsed', async () => {
    await createEnquiry(sql, enquiry());
    await expireHolds();

    const second = await createEnquiry(sql, enquiry({ fullName: 'Иван' }));

    expect(second.ok).toBe(true);
    expect(await sql`SELECT 1 FROM booking_resource WHERE active`).toHaveLength(1);
  });

  it('makes an allocation permanent when the hold is confirmed', async () => {
    const created = await createEnquiry(sql, enquiry());
    if (!created.ok) throw new Error('setup failed');

    expect(await confirmHold(sql, created.reference)).toBe('confirmed');

    const [row] = await sql<{ state: string; expiresAt: Date | null; status: string }[]>`
      SELECT br.state, br.expires_at AS "expiresAt", b.status
      FROM booking_resource br JOIN booking b ON b.id = br.booking_id`;

    expect(row).toEqual({ state: 'confirmed', expiresAt: null, status: 'confirmed' });
  });

  it('keeps a confirmed date blocked no matter how much time passes', async () => {
    const created = await createEnquiry(sql, enquiry());
    if (!created.ok) throw new Error('setup failed');
    await confirmHold(sql, created.reference);

    await releaseExpired(sql);

    expect(await isDateAvailable(sql, EVENT_DATE)).toBe(false);
  });

  it('refuses to confirm a hold that has already lapsed', async () => {
    const created = await createEnquiry(sql, enquiry());
    if (!created.ok) throw new Error('setup failed');
    await expireHolds();

    expect(await confirmHold(sql, created.reference)).toBe('expired');
  });

  it('reports an unknown reference rather than inventing a booking', async () => {
    expect(await confirmHold(sql, 'JM-1999-0001')).toBe('not_found');
  });

  it('retires a lapsed hold on the contended date without waiting for the sweeper', async () => {
    await createEnquiry(sql, enquiry());
    await expireHolds();

    await createEnquiry(sql, enquiry({ fullName: 'Иван' }));

    // The allocation path already dealt with it, which is the point of sweeping there.
    expect(await releaseExpired(sql)).toBe(0);
  });

  it('sweeps lapsed holds on dates nobody is contending, and leaves live ones alone', async () => {
    await createEnquiry(sql, enquiry());
    await expireHolds();
    await createEnquiry(sql, enquiry({ fullName: 'Иван', eventDate: '2027-08-21' }));

    expect(await releaseExpired(sql)).toBe(1);
    expect(await sql`SELECT 1 FROM booking_resource WHERE active`).toHaveLength(1);
  });
});
