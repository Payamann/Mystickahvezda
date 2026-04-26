-- ============================================================================
-- MYSTICKÁ HVĚZDA - EMAIL QUEUE MIGRATION
-- Copy & Paste all SQL below into Supabase SQL Editor
-- ============================================================================

-- STEP 1: Create timestamp update function (if not exists)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================

-- STEP 2: Create email_queue table
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_to VARCHAR(255) NOT NULL,
    template VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',

    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    email_id VARCHAR(255),

    -- Retry logic
    retry_count INT DEFAULT 0,
    last_error TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
    ON email_queue(status, scheduled_for)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_user_id
    ON email_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_template
    ON email_queue(template);

-- ============================================================================

-- STEP 4: Enable RLS and create policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_queue_select_own_emails
    ON email_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY email_queue_service_role
    ON email_queue FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================

-- STEP 5: Create auto-update trigger
CREATE TRIGGER update_email_queue_timestamp
    BEFORE UPDATE ON email_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE! ✅
-- ============================================================================

-- Verify everything worked:
-- SELECT count(*) FROM email_queue;  -- Should return 0
-- SELECT * FROM pg_indexes WHERE tablename = 'email_queue';  -- Should show 3 indexes
