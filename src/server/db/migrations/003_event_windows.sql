-- Event times live in the database so that DST is handled by PostgreSQL's timezone
-- data rather than by JavaScript. A June wedding and a November one are both "18:00
-- local", but they are two different UTC offsets.

-- Doors open at 18:00 and the night ends at 03:00, so every event spans midnight.
CREATE FUNCTION default_event_window(day date) RETURNS tstzrange
LANGUAGE sql STABLE AS $$
  SELECT tstzrange(
    (day + time '18:00') AT TIME ZONE 'Europe/Sofia',
    (day + interval '1 day' + time '03:00') AT TIME ZONE 'Europe/Sofia',
    '[)'
  );
$$;

-- What actually blocks a resource: the event plus rigging and teardown either side.
CREATE FUNCTION default_allocation_slot(day date) RETURNS tstzrange
LANGUAGE sql STABLE AS $$
  SELECT tstzrange(
    lower(default_event_window(day)) - interval '2 hours',
    upper(default_event_window(day)) + interval '1 hour',
    '[)'
  );
$$;

CREATE SEQUENCE booking_reference_seq;

ALTER TABLE booking
  ALTER COLUMN reference
  SET DEFAULT 'JM-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('booking_reference_seq')::text, 4, '0');
