-- Upgrade the Discovery Flight to 30 minutes. Existing booking snapshots intentionally retain their
-- original duration so historical orders remain auditable.

UPDATE public.packages
SET
  duration_minutes = 30,
  title = 'Discovery Flight — 30-Minute Boeing 737 Experience',
  slug = 'discovery-flight-30',
  price_ils = 450,
  price_usd = 125,
  short_desc = 'A guided 30-minute Boeing 737 mission with takeoff, hands-on flight and landing.',
  description = 'Take the Captain''s seat in our 1:1 scale Boeing 737 MAX cockpit for a complete 30-minute discovery mission with an active airline captain.',
  badge = 'Discovery 30m • ₪450',
  yield_per_min_ils = 10
WHERE id = 'pkg-discovery-30';

ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_duration_minutes_check;

ALTER TABLE public.packages
  ADD CONSTRAINT packages_duration_minutes_check
  CHECK (duration_minutes IN (30, 45, 60, 90, 120, 240));
