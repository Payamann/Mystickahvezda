-- ============================================================
-- Security fixes — 2026-04-05
-- Fixes all Supabase Security Advisor issues:
--   6 Errors:   RLS disabled on public tables
--   5 Warnings: Function search_path mutable
--   1 Warning:  RLS policy always true (newsletter_subscribers)
--   1 Warning:  Leaked password protection disabled
--   2 Info:     RLS enabled but no policy
-- ============================================================


-- ============================================================
-- 1. FIX: RLS na cache tabulkách (server-side only, bez user dat)
--    Cache čte/zapisuje pouze service_role (backend server).
--    anon/authenticated nemají přístup — data jsou sdílená, ne user-specific.
-- ============================================================

ALTER TABLE public.cache_horoscopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_numerology  ENABLE ROW LEVEL SECURITY;

-- Service role má vždy bypass RLS, žádná extra policy není nutná.
-- Explicitně zamítneme všem ostatním (anon, authenticated):
DROP POLICY IF EXISTS "No direct access to cache_horoscopes" ON public.cache_horoscopes;
CREATE POLICY "No direct access to cache_horoscopes"
  ON public.cache_horoscopes
  FOR ALL
  USING (false);

DROP POLICY IF EXISTS "No direct access to cache_numerology" ON public.cache_numerology;
CREATE POLICY "No direct access to cache_numerology"
  ON public.cache_numerology
  FOR ALL
  USING (false);


-- ============================================================
-- 2. FIX: RLS na cache_past_life
-- ============================================================

ALTER TABLE public.cache_past_life ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to cache_past_life" ON public.cache_past_life;
CREATE POLICY "No direct access to cache_past_life"
  ON public.cache_past_life
  FOR ALL
  USING (false);


-- ============================================================
-- 3. FIX: RLS na cache_medicine_wheel
-- ============================================================

ALTER TABLE public.cache_medicine_wheel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to cache_medicine_wheel" ON public.cache_medicine_wheel;
CREATE POLICY "No direct access to cache_medicine_wheel"
  ON public.cache_medicine_wheel
  FOR ALL
  USING (false);


-- ============================================================
-- 4. FIX: RLS na horoscope_subscriptions
--    Přihlášení uživatelé vidí jen svůj záznam (podle email nebo user_id).
--    Nepřihlášení nemohou číst vůbec.
--    Backend (service_role) má vždy přístup.
-- ============================================================

ALTER TABLE public.horoscope_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.horoscope_subscriptions;
CREATE POLICY "Users can read own subscription"
  ON public.horoscope_subscriptions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own subscription" ON public.horoscope_subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.horoscope_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());


-- ============================================================
-- 5. FIX: RLS na retention_feedback
--    Uživatel vidí jen svůj vlastní feedback.
-- ============================================================

ALTER TABLE public.retention_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.retention_feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.retention_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can read own feedback" ON public.retention_feedback;
CREATE POLICY "Users can read own feedback"
  ON public.retention_feedback
  FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- 6. FIX: newsletter_subscribers — RLS policy "always true"
--    Původní policy měla USING (true) — příliš permisivní.
--    Správně: INSERT povolíme všem (i anonymním), SELECT jen service_role.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Zrušíme jakoukoliv existující SELECT policy co je USING (true):
DROP POLICY IF EXISTS "Public read" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can read newsletter" ON public.newsletter_subscribers;
-- SELECT ponecháme bez policy → pouze service_role má přístup (bypass RLS).


-- ============================================================
-- 7. FIX: app_logs — RLS zapnuté ale bez policy
--    Logy píše backend (service_role). Uživatelé nemají přímý přístup.
-- ============================================================

DROP POLICY IF EXISTS "No direct access to app_logs" ON public.app_logs;
CREATE POLICY "No direct access to app_logs"
  ON public.app_logs
  FOR ALL
  USING (false);


-- ============================================================
-- 8. FIX: payment_events — RLS zapnuté ale bez policy
--    Platební eventy zpracovává pouze backend (service_role).
-- ============================================================

DROP POLICY IF EXISTS "No direct access to payment_events" ON public.payment_events;
CREATE POLICY "No direct access to payment_events"
  ON public.payment_events
  FOR ALL
  USING (false);


-- ============================================================
-- 9. FIX: Function search_path mutable → SET search_path = ''
--    Zabrání schema-injection útoku (CVE kategorie: privilege escalation).
--    Každá funkce musí explicitně odkazovat na public.tabulka.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_angel_likes(card_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.angel_cards_stats
  SET likes = likes + 1
  WHERE name = card_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'user', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER := 0;
  row_count_temp INTEGER;
BEGIN
  DELETE FROM public.cache_horoscopes
  WHERE period = 'daily'
    AND generated_at < NOW() - INTERVAL '2 days';
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;

  DELETE FROM public.cache_horoscopes
  WHERE period = 'weekly'
    AND generated_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;

  DELETE FROM public.cache_horoscopes
  WHERE period = 'monthly'
    AND generated_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;

  DELETE FROM public.cache_numerology
  WHERE generated_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;

  DELETE FROM public.cache_past_life
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;

  RETURN deleted_count;
END;
$$;


-- ============================================================
-- 10. NOTE: Leaked Password Protection
--     Toto NELZE opravit SQL migrací.
--     Jdi do: Supabase Dashboard → Authentication → Settings
--     → "Password Protection" → zapni "Enable leaked password protection"
-- ============================================================
