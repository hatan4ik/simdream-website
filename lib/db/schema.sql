-- ==============================================================================
-- SIM DREAM LTD (simdream.co.il) - BOEING 737 MAX FLIGHT SIMULATION CENTER
-- PRODUCTION SUPABASE / POSTGRESQL DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    total_flight_hours NUMERIC(6, 2) DEFAULT 0.00,
    total_flights INTEGER DEFAULT 0,
    pilot_license TEXT, -- e.g., 'Student', 'PPL', 'CPL', 'ATPL', 'None'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SIMULATOR PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('recreational', 'training', 'corporate', 'fear_of_flying')),
    duration_minutes INTEGER NOT NULL,
    price_ils NUMERIC(10, 2) NOT NULL,
    price_usd NUMERIC(10, 2) NOT NULL,
    short_desc TEXT NOT NULL,
    description TEXT NOT NULL,
    featured BOOLEAN DEFAULT FALSE,
    badge TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    includes_briefing BOOLEAN DEFAULT TRUE,
    instructor_included BOOLEAN DEFAULT TRUE,
    guest_seats INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference TEXT NOT NULL UNIQUE, -- e.g., 'SD-737-8492'
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE RESTRICT,
    package_title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    pilot_name TEXT NOT NULL,
    pilot_email TEXT NOT NULL,
    pilot_phone TEXT NOT NULL,
    experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'enthusiast', 'student_pilot', 'atpl')),
    addons JSONB DEFAULT '[]'::jsonb,
    subtotal_ils NUMERIC(10, 2) NOT NULL,
    discount_ils NUMERIC(10, 2) DEFAULT 0.00,
    total_ils NUMERIC(10, 2) NOT NULL,
    voucher_code TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method TEXT DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'voucher', 'desk')),
    stripe_payment_intent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GIFT VOUCHERS TABLE
CREATE TABLE IF NOT EXISTS public.gift_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- e.g., 'SD-VOUCH-737X'
    initial_value_ils NUMERIC(10, 2) NOT NULL,
    current_balance_ils NUMERIC(10, 2) NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    personal_message TEXT,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CORPORATE CRM WORKSHOPS INQUIRIES
CREATE TABLE IF NOT EXISTS public.corporate_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    team_size INTEGER NOT NULL,
    target_date DATE,
    primary_goal TEXT NOT NULL CHECK (primary_goal IN ('leadership', 'team_communication', 'high_stress_decision_making', 'vip_incentive')),
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FLIGHT LOGBOOK (Pilot flight hours & certifications)
CREATE TABLE IF NOT EXISTS public.flight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    flight_date DATE NOT NULL,
    aircraft_type TEXT DEFAULT 'B737-MAX8',
    flight_time_hours NUMERIC(4, 2) NOT NULL,
    departure_icao TEXT DEFAULT 'LLBG',
    arrival_icao TEXT NOT NULL,
    landings_count INTEGER DEFAULT 1,
    approach_type TEXT DEFAULT 'CAT_III_ILS' CHECK (approach_type IN ('CAT_III_ILS', 'RNP_AR', 'VISUAL', 'RNAV')),
    weather_scenario TEXT,
    instructor_signature TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Packages are publicly readable
CREATE POLICY "Packages are publicly readable" ON public.packages
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage packages" ON public.packages
    FOR ALL USING (public.is_admin());

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can update bookings" ON public.bookings
    FOR ALL USING (public.is_admin());

-- Gift Vouchers policies
CREATE POLICY "Vouchers can be read by code or admin" ON public.gift_vouchers
    FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can purchase voucher" ON public.gift_vouchers
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can update vouchers" ON public.gift_vouchers
    FOR ALL USING (public.is_admin());

-- Corporate inquiries policies
CREATE POLICY "Anyone can submit corporate inquiry" ON public.corporate_inquiries
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view and manage inquiries" ON public.corporate_inquiries
    FOR ALL USING (public.is_admin());

-- Flight logs policies
CREATE POLICY "Users can view own flight logs" ON public.flight_logs
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage flight logs" ON public.flight_logs
    FOR ALL USING (public.is_admin());

