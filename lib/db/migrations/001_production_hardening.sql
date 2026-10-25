-- Apply to an existing project only after a reviewed backup. This migration
-- deliberately aborts if non-cancelled historical bookings overlap; correct
-- those records before retrying so the scheduling exclusion is meaningful.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_package_id_fkey;
ALTER TABLE public.gift_vouchers DROP CONSTRAINT IF EXISTS gift_vouchers_package_id_fkey;
ALTER TABLE public.bookings ALTER COLUMN package_id TYPE TEXT USING package_id::text;
ALTER TABLE public.gift_vouchers ALTER COLUMN package_id TYPE TEXT USING package_id::text;

ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS prime_time_price_ils NUMERIC(10, 2);
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS daytime_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS kantorovich_var TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS yield_per_min_ils NUMERIC(10, 2);

ALTER TABLE public.gift_vouchers ADD COLUMN IF NOT EXISTS package_title TEXT;
ALTER TABLE public.gift_vouchers ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.gift_vouchers ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.gift_vouchers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
UPDATE public.gift_vouchers
  SET payment_status = 'paid', activated_at = COALESCE(activated_at, created_at)
  WHERE payment_status = 'pending' AND current_balance_ils > 0;

ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gift_vouchers_payment_status_check') THEN
    ALTER TABLE public.gift_vouchers
      ADD CONSTRAINT gift_vouchers_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gift_vouchers_balance_check') THEN
    ALTER TABLE public.gift_vouchers
      ADD CONSTRAINT gift_vouchers_balance_check CHECK (current_balance_ils >= 0 AND current_balance_ils <= initial_value_ils);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS gift_vouchers_checkout_session_unique
  ON public.gift_vouchers (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_pilot_email_idx ON public.bookings (lower(pilot_email));
CREATE INDEX IF NOT EXISTS bookings_date_idx ON public.bookings (booking_date, start_time);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bookings a
    JOIN public.bookings b ON a.id < b.id
      AND a.booking_date = b.booking_date
      AND a.status <> 'cancelled' AND b.status <> 'cancelled'
      AND (a.booking_date + a.start_time) < (b.booking_date + b.start_time + ((CASE WHEN b.duration_minutes <= 30 THEN 45 WHEN b.duration_minutes = 120 THEN 150 WHEN b.duration_minutes = 240 THEN 255 ELSE b.duration_minutes + 15 END) * interval '1 minute'))
      AND (b.booking_date + b.start_time) < (a.booking_date + a.start_time + ((CASE WHEN a.duration_minutes <= 30 THEN 45 WHEN a.duration_minutes = 120 THEN 150 WHEN a.duration_minutes = 240 THEN 255 ELSE a.duration_minutes + 15 END) * interval '1 minute'))
  ) THEN
    RAISE EXCEPTION 'Resolve overlapping non-cancelled bookings before applying the scheduling exclusion constraint.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_reserved_time_overlap') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_reserved_time_overlap
      EXCLUDE USING gist (
        tsrange(
          booking_date + start_time,
          booking_date + start_time + ((CASE WHEN duration_minutes <= 30 THEN 45 WHEN duration_minutes = 120 THEN 150 WHEN duration_minutes = 240 THEN 255 ELSE duration_minutes + 15 END) * interval '1 minute'),
          '[)'
        ) WITH &&
      ) WHERE (status <> 'cancelled');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_gift_voucher(p_code TEXT, p_amount NUMERIC)
RETURNS SETOF public.gift_vouchers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE voucher public.gift_vouchers%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  SELECT * INTO voucher FROM public.gift_vouchers
    WHERE code = upper(trim(p_code)) AND payment_status = 'paid'
      AND is_redeemed = false AND expiry_date >= now() AND current_balance_ils >= p_amount
    FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.gift_vouchers SET current_balance_ils = current_balance_ils - p_amount,
    is_redeemed = (current_balance_ils - p_amount) = 0
    WHERE id = voucher.id RETURNING * INTO voucher;
  RETURN NEXT voucher;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Vouchers can be read by code or admin" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Anyone can purchase voucher" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Admins can update vouchers" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Anyone can submit corporate inquiry" ON public.corporate_inquiries;
DROP POLICY IF EXISTS "Admins can view and manage inquiries" ON public.corporate_inquiries;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

REVOKE ALL ON public.bookings, public.gift_vouchers, public.corporate_inquiries, public.flight_logs FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_voucher(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;

COMMIT;
