-- Repair auth.users provisioning triggers after legacy sync functions.
-- Run this after 20260509_supabase_schema_hardening.sql if Auth signup returns
-- "Database error creating new user".

BEGIN;

-- Remove all custom triggers on auth.users. This intentionally leaves internal
-- PostgreSQL/Supabase triggers intact and removes only user-defined triggers.
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users;', trigger_record.tgname);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    metadata JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    normalized_birth_date DATE := NULL;
    normalized_birth_time TIME := NULL;
BEGIN
    IF NULLIF(metadata->>'birth_date', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
        normalized_birth_date := (metadata->>'birth_date')::DATE;
    END IF;

    IF NULLIF(metadata->>'birth_time', '') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN
        normalized_birth_time := (metadata->>'birth_time')::TIME;
    END IF;

    INSERT INTO public.users (
        id,
        email,
        role,
        first_name,
        birth_date,
        birth_time,
        birth_place,
        status
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        'user',
        COALESCE(NULLIF(metadata->>'first_name', ''), NULLIF(metadata->>'name', '')),
        normalized_birth_date,
        normalized_birth_time,
        NULLIF(metadata->>'birth_place', ''),
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = COALESCE(public.users.role, EXCLUDED.role),
        first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
        birth_date = COALESCE(public.users.birth_date, EXCLUDED.birth_date),
        birth_time = COALESCE(public.users.birth_time, EXCLUDED.birth_time),
        birth_place = COALESCE(public.users.birth_place, EXCLUDED.birth_place),
        status = COALESCE(public.users.status, EXCLUDED.status);

    INSERT INTO public.subscriptions (user_id, plan_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.app_logs (event, message, details)
    VALUES (
        'auth_sync_error',
        SQLERRM,
        CONCAT('Email: ', COALESCE(NEW.email, ''), ' | User ID: ', NEW.id::TEXT)
    );
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

COMMIT;
