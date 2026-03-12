-- ============================================================
-- analytics_events table — run once in Supabase SQL Editor
-- Required for Task 2.3 (paywall analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50)  NOT NULL,
    feature     VARCHAR(100),
    metadata    JSONB        DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type    ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user    ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_feature ON analytics_events(feature);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role (server) can do everything; end users see nothing
CREATE POLICY analytics_service_role
    ON analytics_events FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- Verify:
-- SELECT COUNT(*) FROM analytics_events;   -- should return 0
-- ============================================================
