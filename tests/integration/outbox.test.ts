/**
 * The outbox exists to make a booking and its notification atomic with each other. These
 * tests check that property directly, and that delivery survives failure and concurrency.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connect, TEST_DATABASE_URL, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import { createEnquiry, type EnquiryInput } from '../../src/server/domain/bookings.ts';
import { dispatchPending, enqueue } from '../../src/server/notifications/outbox.ts';
import { recordingTransport, type Transport } from '../../src/server/notifications/transport.ts';

const EVENT_DATE = '2027-09-18';

let sql: Sql;

function enquiry(overrides: Partial<EnquiryInput> = {}): EnquiryInput {
  return {
    fullName: 'Мария Петрова',
    phone: '+359888123456',
    email: 'maria@example.com',
    locale: 'bg',
    eventDate: EVENT_DATE,
    serviceKey: 'weddings',
    city: 'София',
    ...overrides,
  };
}

function failingTransport(message = 'smtp unavailable'): Transport {
  return {
    async send() {
      throw new Error(message);
    },
  };
}

beforeAll(async () => {
  sql = connect(TEST_DATABASE_URL, { max: 10 });
  await migrate(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE outbox_message, booking_resource, booking, customer, resource RESTART IDENTITY CASCADE`;
  await sql`ALTER SEQUENCE booking_reference_seq RESTART`;
  await sql`
    INSERT INTO resource (key, kind, label)
    VALUES ('dj-1', 'dj', ${sql.json({ bg: 'DJ 1', en: 'DJ 1' })})`;
});

describe('outbox', () => {
  it('writes the notifications with the booking', async () => {
    await createEnquiry(sql, enquiry());

    const messages = await sql<{ kind: string; recipient: string }[]>`
      SELECT kind, recipient FROM outbox_message ORDER BY kind`;

    expect(messages).toEqual([
      { kind: 'enquiry_alert', recipient: 'jmpartyteam@gmail.com' },
      { kind: 'enquiry_received', recipient: 'maria@example.com' },
    ]);
  });

  it('notifies only the business when the client left no email address', async () => {
    await createEnquiry(sql, enquiry({ email: undefined }));

    const messages = await sql<{ kind: string }[]>`SELECT kind FROM outbox_message`;

    expect(messages).toEqual([{ kind: 'enquiry_alert' }]);
  });

  it('leaves no message behind when the surrounding transaction rolls back', async () => {
    await expect(
      sql.begin(async (tx) => {
        await enqueue(tx, {
          kind: 'enquiry_alert',
          recipient: 'someone@example.com',
          locale: 'bg',
          payload: {},
        });
        throw new Error('booking failed after the message was written');
      })
    ).rejects.toThrow('booking failed');

    expect(await sql`SELECT 1 FROM outbox_message`).toHaveLength(0);
  });

  it('delivers pending messages and marks them sent', async () => {
    await createEnquiry(sql, enquiry());
    const transport = recordingTransport();

    const summary = await dispatchPending(sql, transport);

    expect(summary).toEqual({ sent: 2, retried: 0, failed: 0 });
    expect(transport.sent.map((n) => n.kind).sort()).toEqual([
      'enquiry_alert',
      'enquiry_received',
    ]);
    expect(await sql`SELECT 1 FROM outbox_message WHERE state = 'sent'`).toHaveLength(2);
  });

  it('carries the payload through to the transport', async () => {
    const created = await createEnquiry(sql, enquiry());
    if (!created.ok) throw new Error('setup failed');
    const transport = recordingTransport();

    await dispatchPending(sql, transport);
    const alert = transport.sent.find((n) => n.kind === 'enquiry_alert');

    expect(alert?.payload).toMatchObject({
      reference: created.reference,
      eventDate: EVENT_DATE,
      phone: '+359888123456',
    });
  });

  it('does not deliver the same message twice', async () => {
    await createEnquiry(sql, enquiry());
    const transport = recordingTransport();

    await dispatchPending(sql, transport);
    await dispatchPending(sql, transport);

    expect(transport.sent).toHaveLength(2);
  });

  it('keeps a failed message for a later attempt and records why', async () => {
    await createEnquiry(sql, enquiry({ email: undefined }));

    const summary = await dispatchPending(sql, failingTransport());

    expect(summary).toEqual({ sent: 0, retried: 1, failed: 0 });

    const [row] = await sql<{ state: string; attempts: number; lastError: string }[]>`
      SELECT state, attempts, last_error AS "lastError" FROM outbox_message`;

    expect(row).toMatchObject({ state: 'pending', attempts: 1, lastError: 'smtp unavailable' });
  });

  it('backs off further after each failure', async () => {
    await createEnquiry(sql, enquiry({ email: undefined }));

    const delays: number[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await sql`UPDATE outbox_message SET next_attempt_at = now()`;
      await dispatchPending(sql, failingTransport());
      const [row] = await sql<{ seconds: number }[]>`
        SELECT extract(epoch FROM next_attempt_at - now()) AS seconds FROM outbox_message`;
      delays.push(Number(row.seconds));
    }

    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it('gives up after the attempt limit rather than retrying for ever', async () => {
    await createEnquiry(sql, enquiry({ email: undefined }));

    let summary = { sent: 0, retried: 0, failed: 0 };
    for (let attempt = 0; attempt < 3; attempt++) {
      await sql`UPDATE outbox_message SET next_attempt_at = now()`;
      summary = await dispatchPending(sql, failingTransport(), { maxAttempts: 3 });
    }

    expect(summary.failed).toBe(1);
    expect(await sql`SELECT 1 FROM outbox_message WHERE state = 'failed'`).toHaveLength(1);
  });

  it('hands disjoint work to dispatchers running at the same time', async () => {
    for (let i = 0; i < 12; i++) {
      await enqueue(sql, {
        kind: 'enquiry_alert',
        recipient: `dj-${i}@example.com`,
        locale: 'bg',
        payload: { index: i },
      });
    }

    const transports = [recordingTransport(), recordingTransport(), recordingTransport()];
    await Promise.all(transports.map((t) => dispatchPending(sql, t, { batchSize: 12 })));

    const delivered = transports.flatMap((t) => t.sent.map((n) => n.id));

    expect(delivered).toHaveLength(12);
    expect(new Set(delivered).size).toBe(12);
  });
});
