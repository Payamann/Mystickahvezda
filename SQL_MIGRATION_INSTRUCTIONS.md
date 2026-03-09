# SQL Migration Instructions

Spusť tyto SQL příkazy v Supabase SQL Editor (Production).

---

## Step 1: Create Timestamp Update Function (IF NOT EXISTS)

```sql
-- Create trigger function for auto-updating updated_at timestamp
-- Run this FIRST if you don't have it yet
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 2: Create Email Queue Table

```sql
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
```

---

## Step 3: Create Indexes

```sql
-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
    ON email_queue(status, scheduled_for)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_user_id
    ON email_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_template
    ON email_queue(template);
```

---

## Step 4: Enable Row Level Security (RLS)

```sql
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
```

---

## Step 5: Create Auto-Update Trigger

```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER update_email_queue_timestamp
    BEFORE UPDATE ON email_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
```

---

## Summary

| Step | SQL | Time | Status |
|------|-----|------|--------|
| 1 | Create `update_timestamp()` function | 1s | ⏳ If needed |
| 2 | Create `email_queue` table | 2s | ✅ Required |
| 3 | Create 3 indexes | 3s | ✅ Required |
| 4 | Enable RLS & policies | 2s | ✅ Required |
| 5 | Create trigger | 1s | ✅ Required |
| **Total** | | **~9s** | ✅ |

---

## How to Run in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy & paste SQL from Step 1
5. Click **Run** (or Ctrl+Enter)
6. Repeat for Steps 2-5

**OR** use SQL Editor shortcuts:
- ⌘K (Mac) / Ctrl+K (Windows) → Search "SQL Editor"
- Paste entire migration at once

---

## Verification

After running all steps, verify with:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'email_queue';

-- Check table structure
\d email_queue;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'email_queue';

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'email_queue';
```

---

## Production Checklist

- [ ] Step 1: Function created or already exists
- [ ] Step 2: email_queue table created
- [ ] Step 3: All 3 indexes created
- [ ] Step 4: RLS enabled with 2 policies
- [ ] Step 5: Trigger created
- [ ] Verification queries passed
- [ ] `.env` has `RESEND_API_KEY` set
- [ ] Server deployed
- [ ] Job processor running (check logs for `[JOB]`)
- [ ] Test email sent via `/api/payment/email/send`

---

## Troubleshooting

### Error: "Function update_timestamp does not exist"
**Solution:** Run Step 1 first to create the function

### Error: "Relation email_queue already exists"
**Solution:** Table already exists, that's OK! Skip to next step or delete old table:
```sql
DROP TABLE IF EXISTS email_queue;
```

### Error: "Foreign key constraint failed"
**Solution:** Make sure `users` table exists first (it should)

### RLS Policy Not Working
**Solution:** Run this to verify:
```sql
-- Check RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'email_queue';
-- Should return: relrowsecurity = true
```

### Trigger Not Auto-Updating
**Solution:** Check if function exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'update_timestamp';
```

---

## Files Reference

- Migration SQL: `migrations/20260309_create_email_queue.sql`
- Backend code: `server/email-service.js`, `server/jobs/email-queue.js`
- Documentation: `EMAIL_QUEUE_SETUP.md`

---

## Next Steps

1. ✅ Run all SQL migrations above
2. ✅ Verify table created with queries above
3. ✅ Deploy server code
4. ✅ Set `RESEND_API_KEY` in production `.env`
5. ✅ Restart server
6. ✅ Check logs for `[JOB] Email queue processor initialized`
7. ✅ Test by subscribing new user
8. ✅ Check `email_queue` table for queued emails

**Done! Email system is live!** 🚀
