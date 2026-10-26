-- Exactly-once confirmation emails for Stripe webhook deliveries.
-- Apply after 003_exact_pilot_email_matching.sql and a reviewed production backup.
--
-- The webhook used to mark a booking paid and then send the email; when SendGrid
-- failed, Stripe's retry found nothing pending and the customer never heard back.
-- Sending is now its own step: a delivery claims it (confirmation_claimed_at),
-- sends, and records success (confirmation_sent_at). A failed send releases the
-- claim and answers 5xx so Stripe redelivers. A claim older than ten minutes is
-- treated as abandoned by a crashed sender and may be taken over.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;

ALTER TABLE public.gift_vouchers
  ADD COLUMN IF NOT EXISTS confirmation_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;

-- Rows paid before this migration were confirmed by the previous flow.
UPDATE public.bookings
SET confirmation_sent_at = created_at
WHERE payment_status = 'paid' AND confirmation_sent_at IS NULL;

UPDATE public.gift_vouchers
SET confirmation_sent_at = COALESCE(activated_at, created_at)
WHERE payment_status = 'paid' AND confirmation_sent_at IS NULL;

COMMIT;
