/**
 * Proves the central claim of the project: check-then-insert does not prevent
 * double-booking under concurrency, and the exclusion constraint does.
 *
 * Requires a local PostgreSQL. See README for setup.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connect, TEST_DATABASE_URL, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import {
  allocateGuarded,
  allocateNaive,
  allocateSerialized,
  countOverlapping,
  type Slot,
} from '../../src/server/domain/booking-allocation.ts';

const CONTESTED: Slot = {
  start: new Date('2026-06-20T15:00:00+03:00'),
  end: new Date('2026-06-21T03:00:00+03:00'),
};

const WORKERS = 8;

let sql: Sql;
let resourceId: string;
let bookingIds: string[];

/** Releases every waiter only once all of them have arrived. */
function createBarrier(size: number) {
  let arrived = 0;
  let release!: () => void;
  const open = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    if (++arrived === size) release();
    await open;
  };
}

async function setGuard(enabled: boolean) {
  await sql`ALTER TABLE booking_resource DROP CONSTRAINT IF EXISTS no_double_booking`;
  if (enabled) {
    await sql.unsafe(`
      ALTER TABLE booking_resource
        ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (resource_id WITH =, slot WITH &&) WHERE (active)`);
  }
}

beforeAll(async () => {
  sql = connect(TEST_DATABASE_URL, {
    // Every worker holds a transaction open at the barrier, so the pool must outnumber them.
    max: WORKERS + 4,
    // Only shortens how long PostgreSQL waits before looking for a cycle. The default
    // second per deadlock makes the naive path take seconds to resolve, which says
    // nothing extra once the behaviour itself has been demonstrated.
    connection: { deadlock_timeout: '50ms' },
  });
  await migrate(sql);
});

afterAll(async () => {
  await setGuard(true);
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE booking_resource, booking, customer, resource RESTART IDENTITY CASCADE`;

  const [resource] = await sql<{ id: string }[]>`
    INSERT INTO resource (key, kind, label)
    VALUES ('dj-primary', 'dj', ${sql.json({ bg: 'DJ 1', en: 'DJ 1' })})
    RETURNING id`;
  resourceId = resource.id;

  const [customer] = await sql<{ id: string }[]>`
    INSERT INTO customer (full_name, phone, locale)
    VALUES ('Test Client', '+359888000000', 'bg')
    RETURNING id`;

  const rows = await Promise.all(
    Array.from({ length: WORKERS }, async (_, i) => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO booking (reference, customer_id, event_window, service_key, city)
        VALUES (
          ${`JM-2026-${String(i + 1).padStart(4, '0')}`},
          ${customer.id},
          tstzrange(${CONTESTED.start}, ${CONTESTED.end}, '[)'),
          'weddings',
          'Sofia'
        )
        RETURNING id`;
      return row;
    })
  );
  bookingIds = rows.map((r) => r.id);
});

describe('resource allocation under concurrency', () => {
  it('lets a single client take a free slot', async () => {
    await setGuard(true);

    const result = await allocateGuarded(sql, {
      bookingId: bookingIds[0],
      resourceId,
      slot: CONTESTED,
    });

    expect(result).toEqual({ ok: true });
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(1);
  });

  it('rejects a second, overlapping allocation of the same resource', async () => {
    await setGuard(true);

    await allocateGuarded(sql, { bookingId: bookingIds[0], resourceId, slot: CONTESTED });
    const second = await allocateGuarded(sql, {
      bookingId: bookingIds[1],
      resourceId,
      slot: { start: new Date('2026-06-20T22:00:00+03:00'), end: CONTESTED.end },
    });

    expect(second).toEqual({ ok: false, reason: 'unavailable' });
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(1);
  });

  it('allows a non-overlapping slot on the same resource', async () => {
    await setGuard(true);

    await allocateGuarded(sql, { bookingId: bookingIds[0], resourceId, slot: CONTESTED });
    const nextDay = {
      start: new Date('2026-06-21T15:00:00+03:00'),
      end: new Date('2026-06-22T03:00:00+03:00'),
    };

    expect(
      await allocateGuarded(sql, { bookingId: bookingIds[1], resourceId, slot: nextDay })
    ).toEqual({ ok: true });
  });

  it('naive check-then-insert admits several overlapping allocations', async () => {
    await setGuard(false);
    const barrier = createBarrier(WORKERS);

    const results = await Promise.all(
      bookingIds.map((bookingId) =>
        allocateNaive(sql, { bookingId, resourceId, slot: CONTESTED }, { afterCheck: barrier })
      )
    );

    const accepted = results.filter((r) => r.ok).length;
    expect(accepted).toBeGreaterThan(1);
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(accepted);
  });

  it('the exclusion constraint admits exactly one of many concurrent attempts', async () => {
    await setGuard(true);

    // allSettled, not all: contenders that lose the race inside the index are aborted
    // by the deadlock detector, so they surface as errors rather than clean refusals.
    const results = await Promise.allSettled(
      bookingIds.map((bookingId) =>
        allocateGuarded(sql, { bookingId, resourceId, slot: CONTESTED })
      )
    );

    const accepted = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;

    expect(accepted).toBe(1);
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(1);
  });

  it('serialising on an advisory lock refuses the losers cleanly, without errors', async () => {
    await setGuard(true);

    const results = await Promise.all(
      bookingIds.map((bookingId) =>
        allocateSerialized(sql, { bookingId, resourceId, slot: CONTESTED })
      )
    );

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(WORKERS - 1);
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(1);
  });

  it('holds even when the naive path races against the constraint', async () => {
    await setGuard(true);
    const barrier = createBarrier(WORKERS);

    const results = await Promise.allSettled(
      bookingIds.map((bookingId) =>
        allocateNaive(sql, { bookingId, resourceId, slot: CONTESTED }, { afterCheck: barrier })
      )
    );

    const accepted = results.filter(
      (r) => r.status === 'fulfilled' && r.value.ok
    ).length;

    expect(accepted).toBe(1);
    expect(await countOverlapping(sql, resourceId, CONTESTED)).toBe(1);
  });
});
