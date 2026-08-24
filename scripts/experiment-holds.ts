/**
 * Measures what the hold deadline costs in either direction.
 *
 * A hold that is too long lets someone who never replies sit on a Saturday that another
 * client would have paid for. A hold that is too short lapses before a genuine client gets
 * round to confirming, and they are turned away having already been accepted. Both failures
 * lose the same booking, so there is an optimum somewhere between them.
 *
 * Timescales are compressed to milliseconds: what governs the outcome is the ratio between
 * the deadline and how long clients take to reply, not the absolute durations. Production
 * uses 48 hours against a reply time measured in hours; here it is 250 ms against 1500 ms.
 *
 * Run: npm run experiment:holds
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect, TEST_DATABASE_URL, type Sql } from '../src/server/db/client.ts';
import { migrate } from '../src/server/db/migrate.ts';
import { createEnquiry } from '../src/server/domain/bookings.ts';
import { confirmHold } from '../src/server/domain/holds.ts';

const TTLS_MS = [250, 500, 1000, 2000, 4000, 8000];
const REPETITIONS = 8;

const ARRIVALS = 60;
// Demand must keep arriving for longer than the longest deadline, otherwise every hold
// outlives the experiment and a long TTL is indistinguishable from an infinite one.
const ARRIVAL_GAP_MS = 100;
const DATES = 12;
const CONFIRM_PROBABILITY = 0.6;
const MAX_CONFIRM_DELAY_MS = 1500;

const FIRST_DATE = new Date('2028-03-04T00:00:00Z');

interface RunResult {
  ttlMs: number;
  run: number;
  accepted: number;
  refusedOnArrival: number;
  confirmed: number;
  confirmTooLate: number;
  datesSold: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Saturdays, so the dates are plausible and never overlap each other. */
function eventDate(index: number): string {
  const date = new Date(FIRST_DATE);
  date.setUTCDate(date.getUTCDate() + index * 7);
  return date.toISOString().slice(0, 10);
}

async function reset(sql: Sql) {
  await sql`TRUNCATE booking_resource, booking, customer, resource RESTART IDENTITY CASCADE`;
  await sql`ALTER SEQUENCE booking_reference_seq RESTART`;
  await sql`
    INSERT INTO resource (key, kind, label)
    VALUES ('dj-1', 'dj', ${sql.json({ bg: 'DJ 1', en: 'DJ 1' })})`;
}

async function measure(sql: Sql, ttlMs: number, run: number): Promise<RunResult> {
  await reset(sql);

  let accepted = 0;
  let refusedOnArrival = 0;
  let confirmed = 0;
  let confirmTooLate = 0;
  const pending: Promise<void>[] = [];

  for (let i = 0; i < ARRIVALS; i++) {
    await sleep(ARRIVAL_GAP_MS);

    const result = await createEnquiry(
      sql,
      {
        fullName: `Client ${i}`,
        phone: `+35988800${String(i).padStart(4, '0')}`,
        locale: 'bg',
        eventDate: eventDate(Math.floor(Math.random() * DATES)),
        serviceKey: 'weddings',
        city: 'Sofia',
      },
      ttlMs / 1000
    );

    if (!result.ok) {
      refusedOnArrival++;
      continue;
    }

    accepted++;

    // Some clients never reply at all; the rest take a while.
    if (Math.random() >= CONFIRM_PROBABILITY) continue;

    const reference = result.reference;
    const delay = Math.random() * MAX_CONFIRM_DELAY_MS;

    pending.push(
      (async () => {
        await sleep(delay);
        const outcome = await confirmHold(sql, reference);
        if (outcome === 'confirmed') confirmed++;
        else confirmTooLate++;
      })()
    );
  }

  await Promise.all(pending);

  const [row] = await sql<{ datesSold: string }[]>`
    SELECT count(DISTINCT br.slot) AS "datesSold"
    FROM booking_resource br
    WHERE br.active AND br.state = 'confirmed'`;

  return {
    ttlMs,
    run,
    accepted,
    refusedOnArrival,
    confirmed,
    confirmTooLate,
    datesSold: Number(row.datesSold),
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - average) ** 2)));
}

function toCsv(results: RunResult[]): string {
  const header = 'ttl_ms,run,accepted,refused_on_arrival,confirmed,confirm_too_late,dates_sold';
  const rows = results.map((r) =>
    [r.ttlMs, r.run, r.accepted, r.refusedOnArrival, r.confirmed, r.confirmTooLate, r.datesSold].join(',')
  );
  return [header, ...rows].join('\n');
}

async function main() {
  const sql = connect(TEST_DATABASE_URL, { max: 20 });
  await migrate(sql);

  const results: RunResult[] = [];

  try {
    for (const ttlMs of TTLS_MS) {
      for (let run = 1; run <= REPETITIONS; run++) {
        const result = await measure(sql, ttlMs, run);
        results.push(result);
        process.stdout.write(
          `ttl=${String(ttlMs).padStart(4)}ms run ${run}/${REPETITIONS}  ` +
            `accepted=${result.accepted} refused=${result.refusedOnArrival} ` +
            `confirmed=${result.confirmed} tooLate=${result.confirmTooLate} ` +
            `datesSold=${result.datesSold}/${DATES}\n`
        );
      }
    }
  } finally {
    await sql.end();
  }

  const outDir = join(process.cwd(), 'docs', 'experiments');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'holds.csv'), toCsv(results), 'utf8');
  await writeFile(
    join(outDir, 'holds.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        parameters: {
          ARRIVALS,
          ARRIVAL_GAP_MS,
          DATES,
          CONFIRM_PROBABILITY,
          MAX_CONFIRM_DELAY_MS,
          REPETITIONS,
        },
        results,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log('\nAveraged over %d runs per deadline:\n', REPETITIONS);
  console.table(
    TTLS_MS.map((ttlMs) => {
      const runs = results.filter((r) => r.ttlMs === ttlMs);
      const confirmed = runs.map((r) => r.confirmed);
      return {
        ttl_ms: ttlMs,
        'ttl / reply time': (ttlMs / MAX_CONFIRM_DELAY_MS).toFixed(2),
        accepted: mean(runs.map((r) => r.accepted)).toFixed(1),
        refused_on_arrival: mean(runs.map((r) => r.refusedOnArrival)).toFixed(1),
        confirmed: mean(confirmed).toFixed(1),
        confirmed_sd: stdDev(confirmed).toFixed(1),
        confirm_too_late: mean(runs.map((r) => r.confirmTooLate)).toFixed(1),
        dates_sold: `${mean(runs.map((r) => r.datesSold)).toFixed(1)} / ${DATES}`,
      };
    })
  );
  console.log(`\nWrote ${join(outDir, 'holds.csv')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
