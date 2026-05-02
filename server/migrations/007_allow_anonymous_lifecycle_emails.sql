-- Allow lifecycle emails for one-time purchases made without a user account.
-- Existing authenticated onboarding emails can still populate user_id.

ALTER TABLE email_queue
    ALTER COLUMN user_id DROP NOT NULL;
