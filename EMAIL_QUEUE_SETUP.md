# Email Queue Setup Guide

## Overview
The email queue system processes scheduled emails asynchronously using `node-schedule`. Emails are stored in the database and processed every 1 minute.

## Architecture

```
Endpoint (POST /email/send)
        ↓
scheduleEmailLater()
        ↓
Database (email_queue table)
        ↓
Email Queue Job (runs every 1 minute)
        ↓
Resend API
        ↓
User Inbox
```

## Setup Steps

### 1. Database Migration

Run the migration in Supabase:

```sql
-- Option A: Via Supabase Dashboard
-- 1. Go to SQL Editor
-- 2. Paste contents of migrations/20260309_create_email_queue.sql
-- 3. Click "Run"

-- Option B: Via CLI (requires supabase CLI)
supabase migration up
```

### 2. Environment Variables

Ensure `.env` has:
```
RESEND_API_KEY=re_LqrnaqS6_6hjiQGJig1kwJjvDnsSWXoXE
DATABASE_URL=your_supabase_url
```

### 3. Verify Setup

Check that jobs are running:
```bash
npm start
# Look for logs:
# [JOB] Email queue processor initialized (runs every 1 minute)
# [JOB] Processing N scheduled emails...
```

## How It Works

### Immediate Emails (Welcome)
```javascript
await sendEmail({
  to: user@example.com,
  template: 'onboarding_welcome',
  data: { plan: 'premium_monthly' }
});
// Sends immediately via Resend
```

### Scheduled Emails (Features - 24h later)
```javascript
await scheduleEmailLater({
  userId,
  email: user@example.com,
  template: 'onboarding_features',
  delaySeconds: 86400  // 24 hours
});
// Stored in email_queue table
// Processed in 24 hours
```

### Job Processor
- Runs every 1 minute (cron: `*/1 * * * *`)
- Fetches pending emails where `scheduled_for <= NOW()`
- Sends via Resend
- Updates status to `sent` or retries up to 3 times

## Email Templates

Available templates in `email-service.js`:

| Template | Delay | Type |
|----------|-------|------|
| `onboarding_welcome` | Immediate | Transactional |
| `onboarding_features` | 24 hours | Marketing |
| `onboarding_nudge` | 72 hours | Marketing |
| `subscription_paused` | Immediate | Transactional |
| `discount_applied` | Immediate | Transactional |

## Status Tracking

Emails have three states in database:
- `pending` - Waiting to be sent
- `sent` - Successfully delivered to Resend
- `failed` - Failed after 3 retries

## Monitoring

### View Pending Emails
```sql
SELECT id, email_to, template, scheduled_for
FROM email_queue
WHERE status = 'pending'
ORDER BY scheduled_for;
```

### View Failed Emails
```sql
SELECT id, email_to, template, last_error, retry_count
FROM email_queue
WHERE status = 'failed';
```

### View Today's Sent Emails
```sql
SELECT email_to, template, sent_at
FROM email_queue
WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '1 day'
ORDER BY sent_at DESC;
```

## Resend Dashboard

Monitor email delivery at: https://resend.com/emails

- View sent emails
- Track bounces/complaints
- Monitor delivery rate
- Check failure reasons

## Troubleshooting

### Emails Not Sending

1. **Check job is running:**
   ```
   Look for [JOB] logs in console
   ```

2. **Check email_queue table:**
   ```sql
   SELECT * FROM email_queue WHERE status = 'failed' LIMIT 5;
   ```

3. **Check Resend API key:**
   ```bash
   echo $RESEND_API_KEY  # Should not be empty
   ```

4. **Check Supabase connection:**
   - Verify DATABASE_URL in .env
   - Check Supabase is online

### High Retry Count

If emails have `retry_count > 2`:
- Check email addresses in `email_to` column
- Check Resend API response in console logs
- May indicate invalid recipient email

### Performance Issues

If job takes > 1 minute:
- Reduce batch size in `email-queue.js` (currently 50)
- Check database query performance
- Monitor Resend API latency

## Production Checklist

- [ ] Database migration applied
- [ ] RESEND_API_KEY set in production .env
- [ ] Job processor running (check logs)
- [ ] Email templates reviewed
- [ ] Bounce/complaint webhook configured (optional)
- [ ] Monitoring dashboard accessible

## Advanced: Custom Retries

To adjust retry behavior, edit `email-queue.js`:

```javascript
// Change max retries (currently 3)
if ((emailRecord.retry_count || 0) >= 3) {
  // Mark as failed
}

// Change check frequency (currently 1 minute)
schedule.scheduleJob('*/5 * * * *', async () => {
  // Run every 5 minutes instead
});
```

## Cost Optimization

**Resend Free Tier:** 100 emails/day

For heavier usage:
- Switch to paid plan ($20/month + overage)
- Or use AWS SES (~$0.10 per 1000 emails)
- Or use Sendgrid

Current usage estimate:
- Welcome: 10-20/day (premium conversions)
- Features nudge: 10-20/day (from 24h ago)
- Engagement nudge: 10-20/day (from 72h ago)
- Pause confirmations: 5-10/day
- Discount confirmations: 2-5/day

**Total: ~50-75 emails/day** ✅ Within free tier

## Files Modified

- `server/index.js` - Initialize job scheduler
- `server/email-service.js` - Schedule delayed emails
- `server/jobs/email-queue.js` - NEW - Job processor
- `migrations/20260309_create_email_queue.sql` - NEW - Database schema
