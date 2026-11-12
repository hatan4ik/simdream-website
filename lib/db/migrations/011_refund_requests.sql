-- Refund requests submitted through the unlisted /refund form (POST /api/refund-requests).
-- Apply after 010_ground_school_inquiries.sql. Idempotent.
--
-- A row is a REQUEST for a person to review, never a refund: nothing in the application pays,
-- cancels or reschedules anything. `evaluation` keeps the rules' likely outcome at the moment of
-- the request (clauses, facts, staff flags) so the reviewer sees what the customer was shown.
-- Service role only: the browser never reads this table. It holds personal data (name, email,
-- phone, free text); decide a retention period before launch (docs/modules/refund-form.md).

BEGIN;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL CHECK (reference ~ '^RF-[A-HJ-NP-Z2-9]{6}$'),
  -- Generated once per form in the browser: a double click or retry stores one row.
  client_request_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'declined')),
  product_kind TEXT NOT NULL CHECK (product_kind IN ('flight', 'voucher', 'subscription')),
  reason TEXT NOT NULL CHECK (
    reason IN ('change_of_plans', 'illness', 'centre_fault', 'duplicate_payment', 'gift_voucher', 'subscription', 'other')
  ),
  -- Exactly what the customer typed (booking reference, voucher code or Wix order number).
  order_reference TEXT NOT NULL CHECK (length(order_reference) BETWEEN 3 AND 64),
  contact_name TEXT NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 120),
  contact_email TEXT NOT NULL CHECK (length(contact_email) BETWEEN 3 AND 254),
  contact_phone TEXT NOT NULL CHECK (length(contact_phone) BETWEEN 6 AND 32),
  session_date DATE,
  session_time TIME,
  -- 'verified' only when reference AND email matched a paid order in this database.
  verification TEXT NOT NULL CHECK (verification IN ('verified', 'unverified')),
  verified_order_id TEXT,
  order_date DATE,
  package_title TEXT CHECK (package_title IS NULL OR length(package_title) <= 200),
  message TEXT CHECK (message IS NULL OR length(message) <= 1000),
  language TEXT NOT NULL CHECK (language IN ('he', 'en', 'ru', 'fr', 'ar', 'es')),
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  evaluation JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  staff_notified_at TIMESTAMPTZ,
  customer_acknowledged_at TIMESTAMPTZ,
  CONSTRAINT refund_requests_reference_key UNIQUE (reference),
  CONSTRAINT refund_requests_client_request_id_key UNIQUE (client_request_id)
);

CREATE INDEX IF NOT EXISTS refund_requests_status_submitted_idx
  ON public.refund_requests (status, submitted_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.refund_requests FROM PUBLIC, anon, authenticated;

COMMIT;
