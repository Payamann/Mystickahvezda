-- Email Queue Table for Resend Email Scheduling
-- Tracks all emails scheduled for later delivery

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
    email_id VARCHAR(255), -- Resend email ID for tracking

    -- Retry logic
    retry_count INT DEFAULT 0,
    last_error TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
    ON email_queue(status, scheduled_for)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_user_id
    ON email_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_template
    ON email_queue(template);

-- RLS Policy for security
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view only their own emails
CREATE POLICY email_queue_select_own_emails
    ON email_queue FOR SELECT
    USING (auth.uid() = user_id);

-- Allow service role to manage all emails
CREATE POLICY email_queue_service_role
    ON email_queue FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-update updated_at timestamp
CREATE TRIGGER update_email_queue_timestamp
    BEFORE UPDATE ON email_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
