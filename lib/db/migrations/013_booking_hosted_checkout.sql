-- The hosted Stripe Checkout of an unpaid card hold, stored on its pending booking.
-- Apply after 012_booking_consent_birthday.sql and a reviewed production backup. Idempotent.
--
-- A pilot who returns from Stripe and submits the same departure again resumes this checkout instead of
-- being refused by their own hold; a retry that differs expires it first, then releases the hold
-- (lib/booking/checkout-hold-policy.ts). Written only while status and payment_status are both 'pending'
-- (lib/db/checkout-hold-store.ts). Additive: three nullable columns and a partial unique index, no data
-- rewrite; bookings made before this migration keep NULL here and are simply replaced on a retry.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_expires_at TIMESTAMPTZ;

-- One Checkout Session pays for one booking, as gift_vouchers.stripe_checkout_session_id (migration 001).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_checkout_session_unique
  ON public.bookings (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

COMMIT;
