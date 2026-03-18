import express from 'express';
import { supabase } from '../db-supabase.js';
import { authenticateToken, requireAdmin } from '../middleware.js';
import {
  sendUpgradeReminders,
  sendChurnRecoveryEmail,
  sendWeeklyFeatureEmail
} from '../email-service.js';

const router = express.Router();

/**
 * EMAIL AUTOMATION ENDPOINTS
 * Manages user email preferences and triggers sequences
 */

// ============================================
// GET /preferences - Get user email preferences
// ============================================
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const { data: preferences, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    // Return default preferences if none exist
    const defaultPreferences = {
      user_id: req.user.id,
      upgrade_reminders: true,
      churn_recovery: true,
      weekly_features: true,
      promotional: true,
      unsubscribe_all: false
    };

    res.json(preferences || defaultPreferences);
  } catch (error) {
    console.error('[EMAIL] Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PUT /preferences - Update email preferences
// ============================================
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { upgrade_reminders, churn_recovery, weekly_features, promotional } = req.body;

    const preferences = {
      user_id: req.user.id,
      upgrade_reminders: upgrade_reminders !== false,
      churn_recovery: churn_recovery !== false,
      weekly_features: weekly_features !== false,
      promotional: promotional !== false,
      unsubscribe_all: false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('email_preferences')
      .upsert(preferences, { onConflict: 'user_id' });

    if (error) {
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({ success: true, preferences });
  } catch (error) {
    console.error('[EMAIL] Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /unsubscribe-all - Unsubscribe from all emails
// ============================================
router.post('/unsubscribe-all', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: req.user.id,
        upgrade_reminders: false,
        churn_recovery: false,
        weekly_features: false,
        promotional: false,
        unsubscribe_all: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    res.json({ success: true, message: 'Unsubscribed from all emails' });
  } catch (error) {
    console.error('[EMAIL] Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /trigger-upgrade-reminders - Admin: Trigger upgrade sequence
// ============================================
router.post('/trigger-upgrade-reminders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check preferences
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('upgrade_reminders, unsubscribe_all')
      .eq('user_id', userId)
      .single();

    if (preferences?.unsubscribe_all || preferences?.upgrade_reminders === false) {
      return res.json({ success: false, message: 'User has disabled upgrade reminders' });
    }

    // Send reminders
    await sendUpgradeReminders(userId, user.email);

    res.json({ success: true, message: 'Upgrade reminders triggered' });
  } catch (error) {
    console.error('[EMAIL] Error triggering reminders:', error);
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

// ============================================
// POST /trigger-churn-recovery - Admin: Trigger churn recovery
// ============================================
router.post('/trigger-churn-recovery', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check preferences
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('churn_recovery, unsubscribe_all')
      .eq('user_id', userId)
      .single();

    if (preferences?.unsubscribe_all || preferences?.churn_recovery === false) {
      return res.json({ success: false, message: 'User has disabled churn recovery emails' });
    }

    // Send email
    await sendChurnRecoveryEmail(userId, user.email);

    res.json({ success: true, message: 'Churn recovery email sent' });
  } catch (error) {
    console.error('[EMAIL] Error triggering churn recovery:', error);
    res.status(500).json({ error: 'Failed to trigger churn recovery' });
  }
});

// ============================================
// POST /send-weekly-feature - Admin: Send weekly feature email
// ============================================
router.post('/send-weekly-feature', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, feature_title, feature_description, benefits, feature_url } = req.body;

    if (!email || !feature_title) {
      return res.status(400).json({ error: 'email and feature_title required' });
    }

    // Fetch all active users with their email preferences in one query
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, email_preferences(weekly_features, unsubscribe_all)')
      .eq('status', 'active');

    if (usersError) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const featureData = {
      feature_title,
      feature_description: feature_description || 'Nová funkce, kterou si musíš vyzkoušet!',
      benefits: benefits || [],
      feature_url: feature_url || process.env.APP_URL
    };

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        // Check preferences from the joined data
        const prefs = Array.isArray(user.email_preferences)
          ? user.email_preferences[0]
          : user.email_preferences;

        if (prefs?.unsubscribe_all || prefs?.weekly_features === false) {
          continue;
        }

        await sendWeeklyFeatureEmail(user.email, featureData);
        sent++;
      } catch (error) {
        console.warn(`[EMAIL] Failed to send to ${user.email}:`, error.message);
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Weekly feature email sent to ${sent} users (${failed} failed)`
    });
  } catch (error) {
    console.error('[EMAIL] Error sending weekly feature:', error);
    res.status(500).json({ error: 'Failed to send weekly feature email' });
  }
});

// ============================================
// GET /queue-stats - Get email queue statistics
// ============================================
router.get('/queue-stats', authenticateToken, async (req, res) => {
  try {
    // Only admins can view queue stats
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('email_queue')
      .select('status');

    if (error) throw error;

    const stats = {
      pending: data.filter(d => d.status === 'pending').length,
      sent: data.filter(d => d.status === 'sent').length,
      failed: data.filter(d => d.status === 'failed').length,
      total: data.length
    };

    res.json(stats);
  } catch (error) {
    console.error('[EMAIL] Error fetching queue stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
