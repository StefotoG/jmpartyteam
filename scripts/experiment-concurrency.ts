/**
 * Measures the three allocation strategies against one another under contention.
 *
 * Every worker in a run targets the same date on the same resource, which is the worst
 * case the system can face and the only case where the strategies differ. What is
 * measured per run: how many allocations were admitted (more than one is a correctness
 * failure), how the losers were told (a clean refusal or an error), and the latency
 * distribution of the attempts.
 *
 * Run: npm run experiment
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect, TEST_DATABASE_URL, type Sql } from '../src/server/db/client.ts';
import { migrate } from '../src/server/db/migrate.ts';
import {
  allocateGuarded,
  allocateNaive,
  allocateSerialized,
  countOverlapping,
  type AllocationResult,
  type Slot,
} from '../src/server/domain/booking-allocation.ts';
import { errorCode } from '../src/server/db/retry.ts';

const STRATEGIES = ['naive', 'constraint-noretry', 'constraint', 'advisory'] as const;
type Strategy = (typeof STRATEGIES)[number];

const CONCURRENCY_LEVELS = [1, 10, 50, 200];
const REPETITIONS = 10;
const EVENT_DAY = '2027-06-19';

const CONTESTED: Slot = {
  start: new Date('2027-06-19T15:00:00+03:00'),
  end: new Date('2027-06-20T04:00:00+03:00'),
};

type Allocator = (
  sql: Sql,
  input: Parameters<typeof allocateGuarded>[1]
) => Promise<AllocationResult>;

const ALLOCATE: Record<Strategy, Allocator> = {
  naive: allocateNaive,
  // Isolates how much of the cost is the deadlock itself and how much is retrying it.
  'constraint-noretry': (sql, input) => allocateGuarded(sql, input, { attempts: 1 }),
  constraint: allocateGuarded,
  advisory: allocateSerialized,
};

interface RunResult {
  strategy: Strategy;
  concurrency: number;
  run: number;
  accepted: number;
  refused: number;
  errored: number;
  overlapping: number;
  violations: number;
  errorCodes: Record<string, number>;
  p50: number;
  p95: number;
  p99: number;
  wallMs: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function setGuard(sql: Sql, enabled: boolean) {
  await sql`ALTER TABLE booking_resource DROP CONSTRAINT IF EXISTS no_double_booking`;
  if (enabled) {
    await sql.unsafe(`
      ALTER TABLE booking_resource
        ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (resource_id WITH =, slot WITH &&) WHERE (active)`);
  }
}

async function reset(sql: Sql, workers: number) {
  await sql`TRUNCATE booking_resource, booking, customer, resource RESTART IDENTITY CASCADE`;
  // Not owned by a column, so TRUNCATE ... RESTART IDENTITY leaves it climbing.
  await sql`ALTER SEQUENCE booking_reference_seq RESTART`;

  const [resource] = await sql<{ id: string }[]>`
    INSERT INTO resource (key, kind, label)
    VALUES ('dj-1', 'dj', ${sql.json({ bg: 'DJ 1', en: 'DJ 1' })})
    RETURNING id`;

  const [customer] = await sql<{ id: string }[]>`
    INSERT INTO customer (full_name, phone, locale)
    VALUES ('Load Test', '+359888000000', 'bg')
    RETURNING id`;

  const bookings = await sql<{ id: string }[]>`
    INSERT INTO booking (customer_id, event_window, service_key, city)
    SELECT ${customer.id}, default_event_window(${EVENT_DAY}::date), 'weddings', 'Sofia'
    FROM generate_series(1, ${workers})
    RETURNING id`;

  return { resourceId: resource.id, bookingIds: bookings.map((b) => b.id) };
}

async function measure(
  sql: Sql,
  strategy: Strategy,
  concurrency: number,
  run: number
): Promise<RunResult> {
  const { resourceId, bookingIds } = await reset(sql, concurrency);
  await setGuard(sql, strategy !== 'naive');

  const allocate = ALLOCATE[strategy];
  const latencies: number[] = [];
  const errorCodes: Record<string, number> = {};
  let accepted = 0;
  let refused = 0;
  let errored = 0;

  const startedAt = performance.now();

  await Promise.all(
    bookingIds.map(async (bookingId) => {
      const attemptStart = performance.now();
      try {
        const result = await allocate(sql, { bookingId, resourceId, slot: CONTESTED });
        if (result.ok) accepted++;
        else refused++;
      } catch (error) {
        errored++;
        const code = errorCode(error) ?? 'unknown';
        errorCodes[code] = (errorCodes[code] ?? 0) + 1;
      } finally {
        latencies.push(performance.now() - attemptStart);
      }
    })
  );

  const wallMs = performance.now() - startedAt;
  const overlapping = await countOverlapping(sql, resourceId, CONTESTED);
  latencies.sort((a, b) => a - b);

  return {
    strategy,
    concurrency,
    run,
    accepted,
    refused,
    errored,
    overlapping,
    violations: Math.max(0, overlapping - 1),
    errorCodes,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    wallMs,
  };
}

function toCsv(results: RunResult[]): string {
  const header =
    'strategy,concurrency,run,accepted,refused,errored,overlapping,violations,p50_ms,p95_ms,p99_ms,wall_ms';
  const rows = results.map((r) =>
    [
      r.strategy,
      r.concurrency,
      r.run,
      r.accepted,
      r.refused,
      r.errored,
      r.overlapping,
      r.violations,
      r.p50.toFixed(2),
      r.p95.toFixed(2),
      r.p99.toFixed(2),
      r.wallMs.toFixed(2),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 50);
}

/**
 * Reports median and max rather than mean: the constraint-only strategy is bimodal,
 * either resolving in milliseconds or collapsing into a deadlock storm, and an average
 * of those two states describes neither.
 */
function summarise(results: RunResult[]) {
  const rows: Record<string, string | number>[] = [];

  for (const strategy of STRATEGIES) {
    for (const concurrency of CONCURRENCY_LEVELS) {
      const runs = results.filter(
        (r) => r.strategy === strategy && r.concurrency === concurrency
      );
      rows.push({
        strategy,
        n: concurrency,
        accepted: mean(runs.map((r) => r.accepted)).toFixed(1),
        violations: runs.reduce((sum, r) => sum + r.violations, 0),
        errored: runs.reduce((sum, r) => sum + r.errored, 0),
        stormRuns: `${runs.filter((r) => r.errored > 0).length}/${runs.length}`,
        p95_median_ms: median(runs.map((r) => r.p95)).toFixed(1),
        p95_max_ms: Math.max(...runs.map((r) => r.p95)).toFixed(1),
        wall_median_ms: median(runs.map((r) => r.wallMs)).toFixed(1),
      });
    }
  }

  return rows;
}

async function main() {
  const maxConcurrency = Math.max(...CONCURRENCY_LEVELS);
  const sql = connect(TEST_DATABASE_URL, { max: maxConcurrency + 10 });

  await migrate(sql);

  // Discarded: the first run pays for connection setup and cold caches.
  await measure(sql, 'advisory', 10, 0);

  const results: RunResult[] = [];

  try {
    for (const strategy of STRATEGIES) {
      for (const concurrency of CONCURRENCY_LEVELS) {
        for (let run = 1; run <= REPETITIONS; run++) {
          const result = await measure(sql, strategy, concurrency, run);
          results.push(result);
          process.stdout.write(
            `${strategy.padEnd(11)} n=${String(concurrency).padStart(3)} ` +
              `run ${run}/${REPETITIONS}  accepted=${result.accepted} ` +
              `refused=${result.refused} errored=${result.errored} ` +
              `overlapping=${result.overlapping} p95=${result.p95.toFixed(1)}ms\n`
          );
        }
      }
    }
  } finally {
    await setGuard(sql, true);
    await sql.end();
  }

  const outDir = join(process.cwd(), 'docs', 'experiments');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'concurrency.csv'), toCsv(results), 'utf8');
  await writeFile(
    join(outDir, 'concurrency.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
    'utf8'
  );

  console.log('\nAveraged over %d runs per cell:\n', REPETITIONS);
  console.table(summarise(results));
  console.log(`\nWrote ${join(outDir, 'concurrency.csv')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
