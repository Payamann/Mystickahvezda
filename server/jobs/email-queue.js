import schedule from 'node-schedule';
import { supabase } from '../db-supabase.js';
import { sendEmail } from '../email-service.js';

/**
 * EMAIL QUEUE JOB PROCESSOR
 * Runs every 1 minute to check and send scheduled emails
 * Emails are scheduled in email_queue table with scheduled_for timestamp
 */

let jobRunning = false;

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

        // Process each email
        for (const emailRecord of emails) {
            try {
                const { id, email_to, template, data } = emailRecord;

                // Send email via Resend
                const result = await sendEmail({
                    to: email_to,
                    template,
                    data: data ? JSON.parse(data) : {}
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

                // Increment retry count
                await supabase
                    .from('email_queue')
                    .update({
                        retry_count: (emailRecord.retry_count || 0) + 1,
                        last_error: emailErr.message,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);

                // Mark as failed after 3 retries
                if ((emailRecord.retry_count || 0) >= 3) {
                    await supabase
                        .from('email_queue')
                        .update({ status: 'failed' })
                        .eq('id', emailRecord.id);
                    console.warn(`[JOB] ✗ Email ${emailRecord.id} marked as failed after 3 retries`);
                }
            }
        }

        console.log(`[JOB] Email queue processed: ${successCount} sent, ${failureCount} failed`);

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
            userId,
            email,
            template,
            data = {},
            delaySeconds = 0
        } = emailConfig;

        const scheduledFor = new Date();
        scheduledFor.setSeconds(scheduledFor.getSeconds() + delaySeconds);

        const { error } = await supabase
            .from('email_queue')
            .insert({
                user_id: userId,
                email_to: email,
                template,
                data: JSON.stringify(data),
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

        return { success: true, scheduledFor };

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
