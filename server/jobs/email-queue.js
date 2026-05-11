import schedule from 'node-schedule';
import { supabase } from '../db-supabase.js';
import { isPremiumPlanType } from '../config/constants.js';

/**
 * EMAIL QUEUE JOB PROCESSOR
 * Runs every 1 minute to check and send scheduled emails
 * Emails are scheduled in email_queue table with scheduled_for timestamp
 */

let jobRunning = false;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'cancel_pending']);

export function parseQueuedEmailData(data) {
    if (!data) return {};

    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
        return data;
    }

    return {};
}

function hasActivePremiumSubscription(subscription) {
    if (!subscription) return false;
    const statusIsActive = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
    const periodIsCurrent = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    return statusIsActive && periodIsCurrent && isPremiumPlanType(subscription.plan_type);
}

export async function shouldSkipQueuedEmailForPremium(emailRecord, queuedData = parseQueuedEmailData(emailRecord?.data)) {
    if (!queuedData?.skipIfPremium || !emailRecord?.user_id) return false;

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', emailRecord.user_id)
        .maybeSingle();

    if (userError) {
        console.warn(`[JOB] Could not check premium flag for queued email ${emailRecord.id}:`, userError.message);
    }

    if (user?.is_premium === true || user?.isPremium === true) {
        return true;
    }

    const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('plan_type, status, current_period_end')
        .eq('user_id', emailRecord.user_id)
        .maybeSingle();

    if (subscriptionError) {
        console.warn(`[JOB] Could not check subscription for queued email ${emailRecord.id}:`, subscriptionError.message);
        return false;
    }

    return hasActivePremiumSubscription(subscription);
}

export async function processEmailQueue() {
    // Prevent concurrent execution
    if (jobRunning) {
        console.log('[JOB] Email queue processor already running, skipping...');
        return;
    }

    jobRunning = true;

    try {
        // Get all pending emails that are due to be sent
        const { data: emails, error } = await supabase
            .from('email_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .order('scheduled_for', { ascending: true })
            .limit(50); // Process max 50 per run to avoid overload

        if (error) {
            console.error('[JOB] Error fetching email queue:', error.message);
            return;
        }

        if (!emails || emails.length === 0) {
            console.log('[JOB] No emails to process');
            jobRunning = false;
            return;
        }

        console.log(`[JOB] Processing ${emails.length} scheduled emails...`);

        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        // Process each email
        for (const emailRecord of emails) {
            try {
                const { id, email_to, template, data } = emailRecord;
                const queuedData = parseQueuedEmailData(data);

                if (await shouldSkipQueuedEmailForPremium(emailRecord, queuedData)) {
                    await supabase
                        .from('email_queue')
                        .update({
                            status: 'skipped',
                            sent_at: new Date().toISOString(),
                            last_error: 'Skipped because user became premium before send.',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    skippedCount++;
                    console.log(`[JOB] ↷ Email skipped for premium user: ${template} to ${email_to}`);
                    continue;
                }

                // Dynamically import sendEmail to avoid circular dependency
                const { sendEmail } = await import('../email-service.js');

                // Send email via Resend
                const result = await sendEmail({
                    to: email_to,
                    template,
                    data: queuedData
                });

                // Mark as sent in database
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        email_id: result.emailId
                    })
                    .eq('id', id);

                successCount++;
                console.log(`[JOB] ✓ Email sent: ${template} to ${email_to}`);

            } catch (emailErr) {
                failureCount++;
                console.error(`[JOB] ✗ Failed to send email ${emailRecord.id}:`, emailErr.message);

                const nextRetryCount = (emailRecord.retry_count || 0) + 1;
                const maxRetries = Number.isFinite(Number(emailRecord.max_retries))
                    ? Number(emailRecord.max_retries)
                    : 3;

                // Increment retry count
                await supabase
                    .from('email_queue')
                    .update({
                        retry_count: nextRetryCount,
                        last_error: emailErr.message,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);

                // Mark as failed once the configured retry budget is exhausted
                if (nextRetryCount >= maxRetries) {
                    await supabase
                        .from('email_queue')
                        .update({ status: 'failed' })
                        .eq('id', emailRecord.id);
                    console.warn(`[JOB] ✗ Email ${emailRecord.id} marked as failed after 3 retries`);
                }
            }
        }

        console.log(`[JOB] Email queue processed: ${successCount} sent, ${skippedCount} skipped, ${failureCount} failed`);

    } catch (error) {
        console.error('[JOB] Unexpected error in email queue processor:', error);
    } finally {
        jobRunning = false;
    }
}

/**
 * Schedule email to be sent later
 * Used by payment.js and other endpoints
 */
export async function scheduleEmailLater(emailConfig) {
    try {
        const {
            userId = null,
            email,
            template,
            data = {},
            delaySeconds = 0,
            dedupeKey = null
        } = emailConfig;
        const cleanDedupeKey = typeof dedupeKey === 'string' && dedupeKey.trim()
            ? dedupeKey.trim()
            : (typeof data?.dedupeKey === 'string' && data.dedupeKey.trim() ? data.dedupeKey.trim() : null);
        const queuedData = cleanDedupeKey && data && typeof data === 'object' && !Array.isArray(data)
            ? { ...data, dedupeKey: cleanDedupeKey }
            : data;

        const scheduledFor = new Date();
        scheduledFor.setSeconds(scheduledFor.getSeconds() + delaySeconds);

        if (cleanDedupeKey) {
            const { data: existingEmails, error: existingError } = await supabase
                .from('email_queue')
                .select('id, data, scheduled_for, status')
                .eq('email_to', email)
                .eq('template', template)
                .in('status', ['pending', 'sent', 'skipped'])
                .limit(50);

            if (existingError) {
                throw existingError;
            }

            const existingEmail = (existingEmails || []).find((emailRecord) => {
                return parseQueuedEmailData(emailRecord.data).dedupeKey === cleanDedupeKey;
            });

            if (existingEmail) {
                console.log(`[JOB] Email already scheduled: ${template} for ${email} (${cleanDedupeKey})`);
                return {
                    success: true,
                    scheduledFor: existingEmail.scheduled_for ? new Date(existingEmail.scheduled_for) : null,
                    skipped: true,
                    existingId: existingEmail.id
                };
            }
        }

        const { error } = await supabase
            .from('email_queue')
            .insert({
                user_id: userId || null,
                email_to: email,
                template,
                data: queuedData,
                scheduled_for: scheduledFor.toISOString(),
                status: 'pending',
                retry_count: 0,
                created_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        const delayMinutes = Math.round(delaySeconds / 60);
        console.log(`[JOB] Email scheduled: ${template} for ${email} in ${delayMinutes} minutes`);

        return { success: true, scheduledFor, skipped: false };

    } catch (error) {
        console.error('[JOB] Error scheduling email:', error);
        throw error;
    }
}

/**
 * Initialize scheduled job runner
 * Runs every 1 minute to process email queue
 */
export function initializeEmailQueueJob() {
    // Every 1 minute, check for emails to send
    const job = schedule.scheduleJob('*/1 * * * *', async () => {
        await processEmailQueue();
    });

    console.log('[JOB] Email queue processor initialized (runs every 1 minute)');

    // Also run once immediately on startup
    processEmailQueue().catch(err => {
        console.error('[JOB] Error on initial email queue run:', err);
    });

    return job;
}

export default {
    processEmailQueue,
    scheduleEmailLater,
    initializeEmailQueueJob
};
