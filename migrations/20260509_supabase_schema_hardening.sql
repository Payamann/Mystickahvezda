-- Supabase production schema hardening and drift repair.
-- Safe to run multiple times.

-- ------------------------------------------------------------
-- Users: fields used by onboarding and lifecycle flows
-- ------------------------------------------------------------
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_status_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_status_check
            CHECK (status IN ('active', 'disabled', 'deleted'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_is_onboarded ON public.users(is_onboarded);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id_unique
    ON public.subscriptions(user_id);

-- Replace common legacy auth sync triggers that attempted to write obsolete
-- columns such as public.users.password.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS sync_user_to_public ON auth.users;
DROP TRIGGER IF EXISTS auth_user_sync_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_public() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        role,
        first_name,
        birth_date,
        birth_time,
        birth_place,
        status,
        created_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        NEW.raw_user_meta_data->>'first_name',
        CASE
            WHEN (NEW.raw_user_meta_data->>'birth_date') ~ '^\d{4}-\d{2}-\d{2}$'
            THEN (NEW.raw_user_meta_data->>'birth_date')::date
            ELSE NULL
        END,
        CASE
            WHEN (NEW.raw_user_meta_data->>'birth_time') ~ '^\d{2}:\d{2}'
            THEN LEFT(NEW.raw_user_meta_data->>'birth_time', 5)
            ELSE NULL
        END,
        NEW.raw_user_meta_data->>'birth_place',
        'active',
        COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
        birth_date = COALESCE(public.users.birth_date, EXCLUDED.birth_date),
        birth_time = COALESCE(public.users.birth_time, EXCLUDED.birth_time),
        birth_place = COALESCE(public.users.birth_place, EXCLUDED.birth_place);

    INSERT INTO public.subscriptions (user_id, plan_type, status)
    SELECT NEW.id, 'free', 'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Email automation schema
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    upgrade_reminders BOOLEAN DEFAULT true,
    churn_recovery BOOLEAN DEFAULT true,
    weekly_features BOOLEAN DEFAULT true,
    promotional BOOLEAN DEFAULT true,
    unsubscribe_all BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email_id VARCHAR(255) NOT NULL,
    template VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_preferences_user_idx ON public.email_preferences(user_id);
CREATE INDEX IF NOT EXISTS email_events_user_idx ON public.email_events(user_id);
CREATE INDEX IF NOT EXISTS email_events_type_idx ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS email_campaigns_user_idx ON public.email_campaigns(user_id, campaign_name);
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON public.email_campaigns(status);

-- Keep email_queue aligned with the app and canonical migration.
ALTER TABLE public.email_queue
    ADD COLUMN IF NOT EXISTS send_after TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3,
    ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ------------------------------------------------------------
-- Push subscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    subscription_json TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- ------------------------------------------------------------
-- Server-owned tables that existed in production but were missing from
-- canonical migrations in this repo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'web_footer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
    ON public.newsletter_subscribers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
    ON public.newsletter_subscribers (is_active);

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    feature TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
    ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
    ON public.analytics_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT,
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_event_created
    ON public.app_logs (event, created_at DESC);

CREATE TABLE IF NOT EXISTS public.one_time_order_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type TEXT NOT NULL,
    product_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'checkout_created',
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_time_order_inputs_email_created
    ON public.one_time_order_inputs (customer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_one_time_order_inputs_session
    ON public.one_time_order_inputs (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_one_time_order_inputs_status_created
    ON public.one_time_order_inputs (status, created_at DESC);

-- ------------------------------------------------------------
-- Payment event drift: support both historical and canonical columns
-- ------------------------------------------------------------
ALTER TABLE public.payment_events
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------
-- Utility timestamp trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_preferences_updated_at ON public.email_preferences;
CREATE TRIGGER email_preferences_updated_at
    BEFORE UPDATE ON public.email_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER email_campaigns_updated_at
    BEFORE UPDATE ON public.email_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS one_time_order_inputs_updated_at ON public.one_time_order_inputs;
CREATE TRIGGER one_time_order_inputs_updated_at
    BEFORE UPDATE ON public.one_time_order_inputs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- RLS hardening for direct Supabase API access
-- The Node backend uses the service role and bypasses these policies.
-- ------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horoscope_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_time_order_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_time_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_numerology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_medicine_wheel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_past_life ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own email preferences" ON public.email_preferences;
CREATE POLICY "Users can read own email preferences"
    ON public.email_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.email_preferences;
CREATE POLICY "Users can insert own email preferences"
    ON public.email_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own email preferences" ON public.email_preferences;
CREATE POLICY "Users can update own email preferences"
    ON public.email_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Server-only tables: no direct anon/authenticated access.
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'newsletter_subscribers',
        'horoscope_subscriptions',
        'email_queue',
        'email_events',
        'email_campaigns',
        'push_subscriptions',
        'one_time_order_inputs',
        'one_time_purchases',
        'funnel_events',
        'analytics_events',
        'app_logs',
        'cache_numerology',
        'cache_medicine_wheel',
        'cache_past_life'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "No direct access" ON public.%I', table_name);
        EXECUTE format(
            'CREATE POLICY "No direct access" ON public.%I FOR ALL USING (false) WITH CHECK (false)',
            table_name
        );
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- Cache cleanup helper aligned with runtime retention job
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_cache()
RETURNS INTEGER AS $$
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

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
