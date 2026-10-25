-- Sim Dream production schema. Apply this to a new Supabase project before
-- setting production environment variables. Existing projects must apply
-- migrations/001_production_hardening.sql after a reviewed backup.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_flight_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (total_flight_hours >= 0),
  total_flights INTEGER NOT NULL DEFAULT 0 CHECK (total_flights >= 0),
  pilot_license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.packages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('recreational', 'training', 'corporate', 'fear_of_flying')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (20, 45, 60, 90, 120, 240)),
  price_ils NUMERIC(10, 2) NOT NULL CHECK (price_ils >= 0),
  prime_time_price_ils NUMERIC(10, 2) CHECK (prime_time_price_ils >= 0),
  price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
  short_desc TEXT NOT NULL,
  description TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  daytime_only BOOLEAN NOT NULL DEFAULT false,
  kantorovich_var TEXT CHECK (kantorovich_var IN ('x1', 'x2', 'x3', 'x4', 'pro')),
  yield_per_min_ils NUMERIC(10, 2) CHECK (yield_per_min_ils >= 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  includes_briefing BOOLEAN NOT NULL DEFAULT true,
  instructor_included BOOLEAN NOT NULL DEFAULT true,
  guest_seats INTEGER NOT NULL DEFAULT 2 CHECK (guest_seats >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE CHECK (booking_reference ~ '^SD-737-[A-Z2-9]{16}$'),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Package selection is validated against the server-side package registry.
  -- This snapshot intentionally survives catalog edits and package retirements.
  package_id TEXT NOT NULL,
  package_title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 20 AND 240),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pilot_name TEXT NOT NULL,
  pilot_email TEXT NOT NULL,
  pilot_phone TEXT NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'enthusiast', 'student_pilot', 'atpl')),
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_ils NUMERIC(10, 2) NOT NULL CHECK (subtotal_ils >= 0),
  discount_ils NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_ils >= 0),
  total_ils NUMERIC(10, 2) NOT NULL CHECK (total_ils >= 0),
  voucher_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'voucher', 'desk')),
  stripe_payment_intent TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (discount_ils <= subtotal_ils),
  CHECK (total_ils = subtotal_ils - discount_ils),
  CHECK ((payment_method = 'voucher' AND payment_status = 'paid') OR payment_method <> 'voucher'),
  EXCLUDE USING gist (
    tsrange(
      booking_date + start_time,
      booking_date + start_time + (
        CASE
          WHEN duration_minutes <= 30 THEN 45
          WHEN duration_minutes = 120 THEN 150
          WHEN duration_minutes = 240 THEN 255
          ELSE duration_minutes + 15
        END * interval '1 minute'
      ),
      '[)'
    ) WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS bookings_pilot_email_idx ON public.bookings (lower(pilot_email));
CREATE INDEX IF NOT EXISTS bookings_date_idx ON public.bookings (booking_date, start_time);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings (user_id);

-- Auth users are the source of member identity. New profiles always receive
-- the least-privilege customer role; the application never derives roles from
-- email addresses or client-controlled metadata.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE member_name TEXT;
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  member_name := NULLIF(btrim(COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  )), '');

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, lower(NEW.email), COALESCE(member_name, 'Sim Dream Member'), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

CREATE TABLE IF NOT EXISTS public.gift_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^SD-VOUCH-[A-Z2-9]{18}$'),
  initial_value_ils NUMERIC(10, 2) NOT NULL CHECK (initial_value_ils > 0),
  current_balance_ils NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_balance_ils >= 0),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  personal_message TEXT,
  package_id TEXT,
  package_title TEXT,
  expiry_date TIMESTAMPTZ NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_checkout_session_id TEXT UNIQUE,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_balance_ils <= initial_value_ils),
  CHECK (payment_status <> 'pending' OR current_balance_ils = 0)
);

CREATE TABLE IF NOT EXISTS public.corporate_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  team_size INTEGER NOT NULL CHECK (team_size BETWEEN 1 AND 500),
  target_date DATE,
  primary_goal TEXT NOT NULL CHECK (primary_goal IN ('leadership', 'team_communication', 'high_stress_decision_making', 'vip_incentive')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  flight_date DATE NOT NULL,
  aircraft_type TEXT NOT NULL DEFAULT 'B737-MAX8',
  flight_time_hours NUMERIC(4, 2) NOT NULL CHECK (flight_time_hours >= 0),
  departure_icao TEXT NOT NULL DEFAULT 'LLBG',
  arrival_icao TEXT NOT NULL,
  landings_count INTEGER NOT NULL DEFAULT 1 CHECK (landings_count >= 0),
  approach_type TEXT NOT NULL CHECK (approach_type IN ('CAT_III_ILS', 'RNP_AR', 'VISUAL', 'RNAV')),
  weather_scenario TEXT,
  instructor_signature TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.redeem_gift_voucher(p_code TEXT, p_amount NUMERIC)
RETURNS SETOF public.gift_vouchers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE voucher public.gift_vouchers%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  SELECT * INTO voucher FROM public.gift_vouchers
    WHERE code = upper(trim(p_code))
      AND payment_status = 'paid'
      AND is_redeemed = false
      AND expiry_date >= now()
      AND current_balance_ils >= p_amount
    FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.gift_vouchers
    SET current_balance_ils = current_balance_ils - p_amount,
        is_redeemed = (current_balance_ils - p_amount) = 0
    WHERE id = voucher.id
    RETURNING * INTO voucher;
  RETURN NEXT voucher;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

-- Public browser access is deliberately limited to active package catalog data.
DROP POLICY IF EXISTS "Packages are publicly readable" ON public.packages;
CREATE POLICY "Packages are publicly readable" ON public.packages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Vouchers can be read by code or admin" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Anyone can purchase voucher" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Admins can update vouchers" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Anyone can submit corporate inquiry" ON public.corporate_inquiries;
DROP POLICY IF EXISTS "Admins can view and manage inquiries" ON public.corporate_inquiries;
DROP POLICY IF EXISTS "Users can view own flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Admins can manage flight logs" ON public.flight_logs;

REVOKE ALL ON public.bookings, public.gift_vouchers, public.corporate_inquiries, public.flight_logs FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_voucher(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
