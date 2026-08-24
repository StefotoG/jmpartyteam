-- An enquiry should not block a date for ever. It takes a hold with a deadline; the slot
-- is only committed when the booking is confirmed.
--
-- Expiry cannot be part of the exclusion constraint: an index predicate must be immutable
-- and now() is not. So `active` stays the arbiter and expired holds are deactivated —
-- eagerly under the advisory lock for the date being contended, and by a sweeper for the
-- rest. That keeps the guarantee in the database while letting the deadline mean something
-- immediately where it matters.

ALTER TABLE booking_resource
  ADD COLUMN state      text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN expires_at timestamptz;

ALTER TABLE booking_resource
  ADD CONSTRAINT booking_resource_state_known
    CHECK (state IN ('held', 'confirmed')),
  ADD CONSTRAINT booking_resource_deadline_matches_state
    CHECK (
      (state = 'held' AND expires_at IS NOT NULL)
      OR (state = 'confirmed' AND expires_at IS NULL)
    );

CREATE INDEX booking_resource_expiring_idx
  ON booking_resource (expires_at)
  WHERE active AND state = 'held';
