/**
 * Writes notifications inside the caller's transaction and delivers them separately.
 *
 * The dispatcher claims work with FOR UPDATE SKIP LOCKED, so several instances can run at
 * once without two of them delivering the same message — the same contention problem as the
 * booking allocation, solved by letting the database hand out disjoint work.
 */
import type { Queryable, Sql } from '../db/client.ts';
import type { Notification, NotificationKind, Payload, Transport } from './transport.ts';

export const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_SECONDS = 30;
const LEASE_SECONDS = 60;

export interface OutboxMessage {
  kind: NotificationKind;
  recipient: string;
  locale: 'bg' | 'en';
  payload: Payload;
}

export interface DispatchSummary {
  sent: number;
  retried: number;
  failed: number;
}

/** Must be called with the transaction that also writes the thing being notified about. */
export async function enqueue(sql: Queryable, message: OutboxMessage): Promise<void> {
  await sql`
    INSERT INTO outbox_message (kind, recipient, locale, payload)
    VALUES (
      ${message.kind},
      ${message.recipient},
      ${message.locale},
      ${sql.json(message.payload)}
    )`;
}

export async function dispatchPending(
  sql: Sql,
  transport: Transport,
  options: { batchSize?: number; maxAttempts?: number } = {}
): Promise<DispatchSummary> {
  const batchSize = options.batchSize ?? 20;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const summary: DispatchSummary = { sent: 0, retried: 0, failed: 0 };

  // Claiming and selecting must be one statement. FOR UPDATE SKIP LOCKED on its own holds
  // the row only for the duration of that statement in autocommit, so a second dispatcher
  // would read the same rows a moment later. Pushing next_attempt_at forward leases the
  // message instead: nobody else sees it, and a dispatcher that dies releases it by itself
  // when the lease lapses.
  const claimed = await sql<Notification[]>`
    UPDATE outbox_message
    SET next_attempt_at = now() + make_interval(secs => ${LEASE_SECONDS})
    WHERE id IN (
      SELECT id
      FROM outbox_message
      WHERE state = 'pending' AND next_attempt_at <= now()
      ORDER BY created_at
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, kind, recipient, locale, payload`;

  for (const notification of claimed) {
    try {
      await transport.send(notification);
      await sql`
        UPDATE outbox_message
        SET state = 'sent', sent_at = now(), attempts = attempts + 1, last_error = NULL
        WHERE id = ${notification.id}`;
      summary.sent++;
    } catch (error) {
      const [row] = await sql<{ attempts: number }[]>`
        UPDATE outbox_message
        SET attempts = attempts + 1,
            last_error = ${error instanceof Error ? error.message : String(error)},
            state = CASE
              WHEN attempts + 1 >= ${maxAttempts} THEN 'failed'
              ELSE 'pending'
            END,
            next_attempt_at = now() + make_interval(
              secs => ${BASE_BACKOFF_SECONDS} * power(2, attempts)
            )
        WHERE id = ${notification.id}
        RETURNING attempts`;

      if (row.attempts >= maxAttempts) summary.failed++;
      else summary.retried++;
    }
  }

  return summary;
}
