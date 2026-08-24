-- Fixes a defect found by the concurrency experiment: lpad(n::text, 4, '0') truncates
-- rather than padding once the number exceeds four digits, so booking 10000 was handed
-- the reference of booking 1000 and collided with it.
--
-- References stay zero-padded to four digits for readability and simply grow wider
-- beyond that. The counter is not reset per year, so a reference is unique for good.

CREATE FUNCTION next_booking_reference() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  counter bigint := nextval('booking_reference_seq');
BEGIN
  RETURN format(
    'JM-%s-%s',
    to_char(now(), 'YYYY'),
    CASE WHEN counter < 10000 THEN lpad(counter::text, 4, '0') ELSE counter::text END
  );
END;
$$;

ALTER TABLE booking ALTER COLUMN reference SET DEFAULT next_booking_reference();
