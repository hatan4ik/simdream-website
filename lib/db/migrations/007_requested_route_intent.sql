-- Preserve customer-selected, captain-confirmed World Trio requests alongside a booking.
-- Apply after 006_discovery_flight_30_minutes.sql and a reviewed production backup.
-- The application validates ids against lib/data/experience-routes.ts; this database constraint
-- is defense in depth against malformed storage writes.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS requested_route_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_requested_route_id_format'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_requested_route_id_format
      CHECK (requested_route_id IS NULL OR requested_route_id ~ '^route-[a-z0-9-]{1,80}$');
  END IF;
END $$;

COMMIT;
