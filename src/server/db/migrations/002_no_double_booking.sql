-- The correctness guarantee of the whole system: one resource cannot hold two
-- overlapping slots. Enforced by the database rather than by application code, so it
-- holds regardless of how many processes race for the same date.
--
-- Kept in its own migration because the concurrency experiment drops and recreates it
-- to measure the naive check-then-insert path against the guarded one.

ALTER TABLE booking_resource
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    resource_id WITH =,
    slot        WITH &&
  ) WHERE (active);
