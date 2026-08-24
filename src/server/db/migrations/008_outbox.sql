-- Sending an email and committing a booking are two different systems, and there is no
-- transaction spanning both. Doing them naively means choosing which way to be wrong:
-- send first and a rolled-back booking still notifies the client; commit first and a crash
-- loses the notification entirely.
--
-- The outbox removes the choice. The message is written in the same transaction as the
-- booking, so it exists exactly when the booking does, and a separate dispatcher delivers
-- it afterwards. Delivery becomes at-least-once rather than exactly-once, which is the
-- price and is worth stating.

CREATE TABLE outbox_message (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,
  recipient       text NOT NULL,
  locale          char(2) NOT NULL DEFAULT 'bg',
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  state           text NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  CONSTRAINT outbox_state_known CHECK (state IN ('pending', 'sent', 'failed')),
  CONSTRAINT outbox_locale_known CHECK (locale IN ('bg', 'en')),
  CONSTRAINT outbox_sent_has_timestamp CHECK (
    (state = 'sent' AND sent_at IS NOT NULL) OR (state <> 'sent' AND sent_at IS NULL)
  )
);

CREATE INDEX outbox_due_idx
  ON outbox_message (next_attempt_at)
  WHERE state = 'pending';
