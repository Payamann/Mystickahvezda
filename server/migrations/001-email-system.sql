-- Email Queue Table
-- Stores scheduled emails to be sent at future times
CREATE TABLE IF NOT EXISTS email_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_to VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  data JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  send_after TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed
  email_id VARCHAR(255), -- Resend email ID
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_error TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for pending emails
CREATE INDEX IF NOT EXISTS email_queue_pending_idx ON email_queue(status, scheduled_for)
  WHERE status = 'pending';

-- Index for user emails
CREATE INDEX IF NOT EXISTS email_queue_user_idx ON email_queue(user_id);

-- Email Preferences Table
-- User preferences for email notifications
CREATE TABLE IF NOT EXISTS email_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  upgrade_reminders BOOLEAN DEFAULT true,
  churn_recovery BOOLEAN DEFAULT true,
  weekly_features BOOLEAN DEFAULT true,
  promotional BOOLEAN DEFAULT true,
  unsubscribe_all BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for user preferences
CREATE INDEX IF NOT EXISTS email_preferences_user_idx ON email_preferences(user_id);

-- Email Events Table
-- Tracks when emails are opened, clicked, etc.
CREATE TABLE IF NOT EXISTS email_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- delivered, opened, clicked, bounced, complained
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for email events
CREATE INDEX IF NOT EXISTS email_events_user_idx ON email_events(user_id);
CREATE INDEX IF NOT EXISTS email_events_type_idx ON email_events(event_type);

-- Email Campaign Tracking Table
-- Track which sequences were sent to which users
CREATE TABLE IF NOT EXISTS email_campaigns (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_name VARCHAR(100) NOT NULL, -- onboarding_welcome, upgrade_reminder_day7, churn_recovery_day25, etc.
  campaign_type VARCHAR(50) NOT NULL, -- sequence, one_time, recurring
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for user campaigns
CREATE INDEX IF NOT EXISTS email_campaigns_user_idx ON email_campaigns(user_id, campaign_name);
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON email_campaigns(status);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to email_queue" ON email_queue;
CREATE POLICY "No direct access to email_queue"
  ON email_queue
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Users can read own email preferences" ON email_preferences;
CREATE POLICY "Users can read own email preferences"
  ON email_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own email preferences" ON email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own email preferences" ON email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "No direct access to email_events" ON email_events;
CREATE POLICY "No direct access to email_events"
  ON email_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct access to email_campaigns" ON email_campaigns;
CREATE POLICY "No direct access to email_campaigns"
  ON email_campaigns
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER email_preferences_updated_at BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
