-- Durable, privacy-preserving rate limiting for public voucher verification and
-- failed admin Basic-auth attempts. Apply after 004_confirmation_outbox.sql.
-- The application hashes subjects before calling this function; raw IP addresses,
-- usernames, and voucher codes are never stored in this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  scope TEXT NOT NULL CHECK (length(scope) BETWEEN 1 AND 80),
  subject_hash TEXT NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
  PRIMARY KEY (scope, subject_hash, window_started_at)
);

CREATE INDEX IF NOT EXISTS security_rate_limits_window_started_at_idx
  ON public.security_rate_limits (window_started_at);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_scope TEXT,
  p_subject_hash TEXT,
  p_window_seconds INTEGER,
  p_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_at TIMESTAMPTZ := clock_timestamp();
  window_started TIMESTAMPTZ;
  attempts INTEGER;
  seconds_remaining INTEGER;
BEGIN
  IF length(p_scope) NOT BETWEEN 1 AND 80
    OR p_subject_hash !~ '^[a-f0-9]{64}$'
    OR p_window_seconds NOT BETWEEN 1 AND 86400
    OR p_limit < 1 THEN
    RAISE EXCEPTION 'invalid rate-limit request';
  END IF;

  window_started := to_timestamp(
    floor(extract(epoch FROM now_at) / p_window_seconds) * p_window_seconds
  );
  seconds_remaining := GREATEST(
    1,
    ceil(extract(epoch FROM (window_started + make_interval(secs => p_window_seconds) - now_at)))::INTEGER
  );

  INSERT INTO public.security_rate_limits (scope, subject_hash, window_started_at, attempt_count)
  VALUES (p_scope, p_subject_hash, window_started, 1)
  ON CONFLICT (scope, subject_hash, window_started_at)
  DO UPDATE SET attempt_count = public.security_rate_limits.attempt_count + 1
  WHERE public.security_rate_limits.attempt_count < p_limit
  RETURNING attempt_count INTO attempts;

  -- Periodic bounded retention. No request data older than two days is useful.
  DELETE FROM public.security_rate_limits
  WHERE window_started_at < now_at - INTERVAL '2 days';

  RETURN QUERY SELECT attempts IS NOT NULL, seconds_remaining;
END;
$$;

REVOKE ALL ON TABLE public.security_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

COMMIT;
