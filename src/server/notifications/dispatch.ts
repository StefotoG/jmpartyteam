/**
 * One pass of the outbox. In production this is a scheduled function; here it is a command
 * so the behaviour can be watched.
 *
 * Run: npm run notifications
 */
import { connect } from '../db/client.ts';
import { dispatchPending } from './outbox.ts';
import { consoleTransport } from './transport.ts';

const sql = connect();

try {
  const summary = await dispatchPending(sql, consoleTransport);
  console.log(
    `sent ${summary.sent}, retrying ${summary.retried}, given up on ${summary.failed}`
  );
} finally {
  await sql.end();
}
