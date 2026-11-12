-- Checkout consent record and the Pilot in Command's birthday discount, stored with each booking.
-- Apply after 010_refund_requests.sql and a reviewed production backup. Idempotent.
--
-- Data minimisation: the full date of birth is NEVER stored. The application validates it against the
-- flight date, then keeps only the month and day (so staff can see the birthday) and the amount of the
-- discount it took off. `discount_ils` stays the total reduction, so the existing
-- `total_ils = subtotal_ils - discount_ils` check keeps holding; `birthday_discount_ils` is the part of
-- it that came from the birthday offer (lib/discounts/birthday).
-- `consent_record` is what the booker confirmed at checkout (rules clause 15, lib/legal/consent-record.ts):
-- both confirmations, the legal and consent version stamps, the page language and the SERVER time.
-- Bookings made before this migration have NULL here. Wix-hosted bookings never reach this table.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pilot_birthday_month SMALLINT,
  ADD COLUMN IF NOT EXISTS pilot_birthday_day SMALLINT,
  ADD COLUMN IF NOT EXISTS birthday_discount_ils NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consent_record JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pilot_birthday_valid') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_pilot_birthday_valid
      CHECK (
        (pilot_birthday_month IS NULL AND pilot_birthday_day IS NULL)
        OR (
          pilot_birthday_month BETWEEN 1 AND 12
          AND pilot_birthday_day BETWEEN 1 AND 31
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_birthday_discount_valid') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_birthday_discount_valid
      CHECK (birthday_discount_ils >= 0 AND birthday_discount_ils <= discount_ils);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_consent_record_shape') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_consent_record_shape
      CHECK (
        consent_record IS NULL
        OR (
          jsonb_typeof(consent_record) = 'object'
          AND consent_record ? 'acceptedAt'
          AND consent_record ? 'consentVersion'
          AND consent_record ? 'legalDocumentVersion'
        )
      );
  END IF;
END $$;

COMMIT;
