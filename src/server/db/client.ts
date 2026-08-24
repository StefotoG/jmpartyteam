import postgres from 'postgres';

export type Sql = postgres.Sql<{}>;

/** Anything queries can run on: the pool, or a transaction handle from `sql.begin`. */
export type Queryable = Sql | postgres.TransactionSql<{}>;

// Local development only. These must become configuration before anything is deployed.
export const DEV_DATABASE_URL = 'postgres://127.0.0.1:5432/jm_booking';
export const TEST_DATABASE_URL = 'postgres://127.0.0.1:5432/jm_booking_test';

export function connect(
  url: string = DEV_DATABASE_URL,
  options: postgres.Options<{}> = {}
): Sql {
  return postgres(url, { onnotice: () => {}, ...options });
}

let shared: Sql | undefined;

/** Reused across requests so a warm serverless container keeps its pool. */
export function db(): Sql {
  return (shared ??= connect());
}
