-- Member accounts, verified purchase claiming, and profile creation.
-- Apply after 001_production_hardening.sql and a reviewed production backup.

BEGIN;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_user_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings (user_id);

-- Social and email users are created in auth.users. The trigger creates a
-- least-privilege customer profile without ever assigning an admin role.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE member_name TEXT;
BEGIN
  -- A provider without a verified email cannot be used to claim purchases.
  -- Do not reject that provider account here; the application handles it with
  -- a clear confirmation requirement instead.
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

COMMIT;
