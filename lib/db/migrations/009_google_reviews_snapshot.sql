-- Twice-daily Google reviews snapshot (06:00 and 17:00 Israel time). One row, id 1, replaced on
-- every refresh by POST /api/reviews/refresh; GET /api/reviews serves it to every visitor so a
-- page view never calls Google. Apply after 008_gift_card_design.sql.
-- reviews_by_language holds, per page language (he, en, ru, fr, ar, es), the newest reviews as
-- Google supplied them: author attribution, publish time, Google's translation and the original.

BEGIN;

CREATE TABLE IF NOT EXISTS public.google_reviews_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fetched_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (length(source) BETWEEN 1 AND 300),
  overall_rating NUMERIC(2, 1) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 5),
  total_reviews_count INTEGER NOT NULL CHECK (total_reviews_count >= 0),
  reviews_by_language JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_reviews_snapshot ENABLE ROW LEVEL SECURITY;

-- Service role only: the public route reads it server-side and re-shapes it per language.
REVOKE ALL ON TABLE public.google_reviews_snapshot FROM PUBLIC, anon, authenticated;

COMMIT;
