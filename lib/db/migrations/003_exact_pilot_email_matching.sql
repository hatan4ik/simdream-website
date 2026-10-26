-- Exact pilot-email matching for member linking and admin lookups.
-- Apply after 002_member_accounts.sql and a reviewed production backup.
--
-- Bookings used to be matched to members with ILIKE, where "_" and "%" in a
-- verified email act as wildcards (a member registered as john_smith@... could
-- claim john.smith@... purchases). The application now stores pilot emails
-- trimmed and lower-cased and matches them with equality; this migration brings
-- existing rows in line and keeps future rows normalized.

BEGIN;

UPDATE public.bookings
SET pilot_email = lower(btrim(pilot_email))
WHERE pilot_email <> lower(btrim(pilot_email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_pilot_email_normalized'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_pilot_email_normalized
      CHECK (pilot_email = lower(btrim(pilot_email)));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bookings_pilot_email_exact_idx ON public.bookings (pilot_email);

COMMIT;
