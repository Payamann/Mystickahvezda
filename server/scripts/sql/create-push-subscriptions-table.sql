-- Push Notification Subscriptions Table
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT UNIQUE NOT NULL,
    subscription_json TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_created ON push_subscriptions(created_at);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: backend service_role bypasses RLS; browser clients get no direct access.
DROP POLICY IF EXISTS "Service role full access" ON push_subscriptions;
CREATE POLICY "No direct access to push_subscriptions" ON push_subscriptions
    FOR ALL USING (false) WITH CHECK (false);
