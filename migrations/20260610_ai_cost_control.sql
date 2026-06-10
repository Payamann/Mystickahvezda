-- Central AI budget, aggregate usage telemetry and persistent response cache.
-- Safe to re-run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  date_key date NOT NULL,
  feature text NOT NULL,
  model text NOT NULL,
  reserved_requests integer NOT NULL DEFAULT 0 CHECK (reserved_requests >= 0),
  successful_requests integer NOT NULL DEFAULT 0 CHECK (successful_requests >= 0),
  failed_requests integer NOT NULL DEFAULT 0 CHECK (failed_requests >= 0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cache_creation_input_tokens bigint NOT NULL DEFAULT 0 CHECK (cache_creation_input_tokens >= 0),
  cache_read_input_tokens bigint NOT NULL DEFAULT 0 CHECK (cache_read_input_tokens >= 0),
  estimated_cost_microusd bigint NOT NULL DEFAULT 0 CHECK (estimated_cost_microusd >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date_key, feature, model)
);

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  cache_key text PRIMARY KEY,
  namespace text NOT NULL,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expiry
  ON public.ai_response_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_namespace_expiry
  ON public.ai_response_cache (namespace, expires_at DESC);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to ai_daily_usage" ON public.ai_daily_usage;
CREATE POLICY "No direct access to ai_daily_usage"
  ON public.ai_daily_usage FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct access to ai_response_cache" ON public.ai_response_cache;
CREATE POLICY "No direct access to ai_response_cache"
  ON public.ai_response_cache FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.reserve_ai_daily_request(
  p_date_key date,
  p_limit integer,
  p_feature text,
  p_model text
)
RETURNS TABLE (allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  INSERT INTO public.ai_daily_usage (date_key, feature, model)
  VALUES (p_date_key, '__all__', '__all__')
  ON CONFLICT (date_key, feature, model) DO NOTHING;

  UPDATE public.ai_daily_usage
  SET reserved_requests = reserved_requests + 1,
      updated_at = now()
  WHERE date_key = p_date_key
    AND feature = '__all__'
    AND model = '__all__'
    AND reserved_requests < greatest(1, p_limit)
  RETURNING reserved_requests INTO v_used;

  IF v_used IS NULL THEN
    SELECT reserved_requests INTO v_used
    FROM public.ai_daily_usage
    WHERE date_key = p_date_key
      AND feature = '__all__'
      AND model = '__all__';
    RETURN QUERY SELECT false, coalesce(v_used, p_limit), 0;
    RETURN;
  END IF;

  INSERT INTO public.ai_daily_usage (
    date_key, feature, model, reserved_requests, updated_at
  )
  VALUES (
    p_date_key, left(coalesce(p_feature, 'unknown'), 100),
    left(coalesce(p_model, 'unknown'), 100), 1, now()
  )
  ON CONFLICT (date_key, feature, model)
  DO UPDATE SET
    reserved_requests = public.ai_daily_usage.reserved_requests + 1,
    updated_at = now();

  RETURN QUERY SELECT true, v_used, greatest(0, p_limit - v_used);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ai_request_outcome(
  p_date_key date,
  p_feature text,
  p_model text,
  p_success boolean,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cache_creation_input_tokens bigint,
  p_cache_read_input_tokens bigint,
  p_estimated_cost_microusd bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_daily_usage (date_key, feature, model)
  VALUES (
    p_date_key, left(coalesce(p_feature, 'unknown'), 100),
    left(coalesce(p_model, 'unknown'), 100)
  )
  ON CONFLICT (date_key, feature, model) DO NOTHING;

  UPDATE public.ai_daily_usage
  SET successful_requests = successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
      failed_requests = failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
      input_tokens = input_tokens + greatest(0, coalesce(p_input_tokens, 0)),
      output_tokens = output_tokens + greatest(0, coalesce(p_output_tokens, 0)),
      cache_creation_input_tokens = cache_creation_input_tokens
        + greatest(0, coalesce(p_cache_creation_input_tokens, 0)),
      cache_read_input_tokens = cache_read_input_tokens
        + greatest(0, coalesce(p_cache_read_input_tokens, 0)),
      estimated_cost_microusd = estimated_cost_microusd
        + greatest(0, coalesce(p_estimated_cost_microusd, 0)),
      updated_at = now()
  WHERE date_key = p_date_key
    AND (
      (feature = left(coalesce(p_feature, 'unknown'), 100)
        AND model = left(coalesce(p_model, 'unknown'), 100))
      OR (feature = '__all__' AND model = '__all__')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_daily_request(date, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_ai_request_outcome(
  date, text, text, boolean, bigint, bigint, bigint, bigint, bigint
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_daily_request(date, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_request_outcome(
  date, text, text, boolean, bigint, bigint, bigint, bigint, bigint
) TO service_role;
