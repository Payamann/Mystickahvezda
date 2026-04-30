-- Privacy and RLS hardening for server-owned tables and one-time paid products.
-- Safe to re-run in Supabase SQL editor.

-- ============================================================
-- 1. One-time order inputs: sensitive birth/focus data stays in
--    our DB and Stripe receives only an internal order id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.one_time_order_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('rocni_horoskop', 'personal_map')),
  product_id text NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'checkout_created'
    CHECK (status IN ('checkout_created', 'fulfilled', 'failed', 'expired')),
  stripe_session_id text UNIQUE,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_one_time_order_inputs_created
  ON public.one_time_order_inputs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_one_time_order_inputs_session
  ON public.one_time_order_inputs (stripe_session_id);

ALTER TABLE public.one_time_order_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to one_time_order_inputs" ON public.one_time_order_inputs;
CREATE POLICY "No direct access to one_time_order_inputs"
  ON public.one_time_order_inputs
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 2. Server-only payment, funnel and email tables.
--    Backend uses service_role, browser clients get no direct access.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.one_time_purchases') IS NOT NULL THEN
    ALTER TABLE public.one_time_purchases ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to one_time_purchases" ON public.one_time_purchases;
    CREATE POLICY "No direct access to one_time_purchases"
      ON public.one_time_purchases
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.funnel_events') IS NOT NULL THEN
    ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to funnel_events" ON public.funnel_events;
    CREATE POLICY "No direct access to funnel_events"
      ON public.funnel_events
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.payment_events') IS NOT NULL THEN
    ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to payment_events" ON public.payment_events;
    CREATE POLICY "No direct access to payment_events"
      ON public.payment_events
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.email_queue') IS NOT NULL THEN
    ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to email_queue" ON public.email_queue;
    CREATE POLICY "No direct access to email_queue"
      ON public.email_queue
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.email_events') IS NOT NULL THEN
    ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to email_events" ON public.email_events;
    CREATE POLICY "No direct access to email_events"
      ON public.email_events
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.email_campaigns') IS NOT NULL THEN
    ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "No direct access to email_campaigns" ON public.email_campaigns;
    CREATE POLICY "No direct access to email_campaigns"
      ON public.email_campaigns
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.email_preferences') IS NOT NULL THEN
    ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can read own email preferences" ON public.email_preferences;
    CREATE POLICY "Users can read own email preferences"
      ON public.email_preferences
      FOR SELECT
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.email_preferences;
    CREATE POLICY "Users can insert own email preferences"
      ON public.email_preferences
      FOR INSERT
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update own email preferences" ON public.email_preferences;
    CREATE POLICY "Users can update own email preferences"
      ON public.email_preferences
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Service role full access" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "No direct access to push_subscriptions" ON public.push_subscriptions;
    CREATE POLICY "No direct access to push_subscriptions"
      ON public.push_subscriptions
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- ============================================================
-- 3. Retention/cancel flow schema drift.
-- ============================================================

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS pause_until timestamptz;

ALTER TABLE IF EXISTS public.retention_feedback
  DROP CONSTRAINT IF EXISTS retention_feedback_type_check;

ALTER TABLE IF EXISTS public.retention_feedback
  ADD CONSTRAINT retention_feedback_type_check
  CHECK (type IN ('churn', 'pause', 'downgrade', 'cancellation', 'discount_applied'));

ALTER TABLE IF EXISTS public.retention_feedback
  DROP CONSTRAINT IF EXISTS retention_feedback_reason_check;

ALTER TABLE IF EXISTS public.retention_feedback
  ADD CONSTRAINT retention_feedback_reason_check
  CHECK (reason IN (
    'too_expensive',
    'not_using',
    'technical_issues',
    'found_alternative',
    'found_better',
    'personal',
    'other',
    'not_provided',
    'retention_offer'
  ));
