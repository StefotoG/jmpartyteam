/**
 * The periodic maintenance pass. In production this is a scheduled function; here it is a
 * command so the behaviour can be watched.
 *
 * Three jobs share it because all three are time-driven and none is worth its own schedule:
 * deliver queued notifications, retire holds whose deadline passed on dates nobody has
 * contended since, and drop rate-limit windows that can never be current again.
 *
 * Run: npm run maintenance
 */
import { connect } from '../db/client.ts';
import { releaseExpired } from '../domain/holds.ts';
import { purgeExpired } from '../security/rate-limit.ts';
import { dispatchPending } from './outbox.ts';
import { consoleTransport } from './transport.ts';

const sql = connect();

try {
  const summary = await dispatchPending(sql, consoleTransport);
  const holdsReleased = await releaseExpired(sql);
  const windowsPurged = await purgeExpired(sql);

  console.log(
    `notifications: sent ${summary.sent}, retrying ${summary.retried}, ` +
      `given up on ${summary.failed}`
  );
  console.log(`holds released: ${holdsReleased}`);
  console.log(`rate-limit windows purged: ${windowsPurged}`);
} finally {
  await sql.end();
}
