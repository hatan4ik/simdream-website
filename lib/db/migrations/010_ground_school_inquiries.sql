-- Cohort-detail requests for independent Ground School coaching. The public API
-- writes through the service role; no browser database policy is granted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ground_school_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  pathway TEXT NOT NULL CHECK (pathway IN ('faa', 'easa', 'exploring')),
  modality TEXT NOT NULL CHECK (modality IN ('online', 'in_person', 'hybrid')),
  focus_topics TEXT,
  consent_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'enrolled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ground_school_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit Ground School inquiry" ON public.ground_school_inquiries;
DROP POLICY IF EXISTS "Admins can view and manage Ground School inquiries" ON public.ground_school_inquiries;
REVOKE ALL ON TABLE public.ground_school_inquiries FROM PUBLIC, anon, authenticated;

COMMIT;
