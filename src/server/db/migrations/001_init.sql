-- Transactional core of the booking subsystem.
--
-- Editorial content (services, packages, prices) stays in Sanity; only the keys and a
-- price snapshot are copied here, so a later CMS edit cannot rewrite an agreed price.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE customer (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  phone        text NOT NULL,
  email        text,
  locale       char(2) NOT NULL DEFAULT 'bg',
  consent_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_locale_known CHECK (locale IN ('bg', 'en'))
);

-- A DJ, a rig, or a hireable extra. Allocation happens against these, not against
-- the business as a whole, so two events on one night are representable.
CREATE TABLE resource (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key     text NOT NULL UNIQUE,
  kind    text NOT NULL,
  label   jsonb NOT NULL,
  active  boolean NOT NULL DEFAULT true,
  CONSTRAINT resource_kind_known CHECK (kind IN ('dj', 'rig', 'extra'))
);

CREATE TABLE booking (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text NOT NULL UNIQUE,
  customer_id    uuid NOT NULL REFERENCES customer (id) ON DELETE RESTRICT,
  event_window   tstzrange NOT NULL,
  service_key    text NOT NULL,
  package_key    text,
  price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_cents    integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'enquiry',
  city           text NOT NULL,
  guest_count    integer,
  notes          text,
  locale         char(2) NOT NULL DEFAULT 'bg',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_status_known CHECK (
    status IN ('enquiry', 'quoted', 'confirmed', 'completed', 'cancelled', 'declined')
  ),
  CONSTRAINT booking_window_forward CHECK (NOT isempty(event_window)),
  CONSTRAINT booking_total_non_negative CHECK (total_cents >= 0),
  CONSTRAINT booking_guests_positive CHECK (guest_count IS NULL OR guest_count > 0)
);

CREATE INDEX booking_event_window_idx ON booking USING gist (event_window);
CREATE INDEX booking_status_idx ON booking (status);

-- Wider than booking.event_window: it carries setup and teardown time, which is what
-- actually makes two events collide.
CREATE TABLE booking_resource (
  booking_id  uuid NOT NULL REFERENCES booking (id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resource (id) ON DELETE RESTRICT,
  slot        tstzrange NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (booking_id, resource_id),
  CONSTRAINT booking_resource_slot_forward CHECK (NOT isempty(slot))
);
