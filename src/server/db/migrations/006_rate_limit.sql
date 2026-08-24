-- Rate limiting has to be shared state: serverless invocations do not see each other's
-- memory, so an in-process counter would reset on every cold start and be trivially
-- bypassed by concurrent requests landing on different instances.
--
-- Fixed windows rather than a sliding log: one row per bucket per window, so the table
-- stays small and the check is a single upsert. The known weakness is that a caller can
-- spend a full allowance at the end of one window and again at the start of the next.

CREATE TABLE rate_limit (
  bucket       text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX rate_limit_window_start_idx ON rate_limit (window_start);
