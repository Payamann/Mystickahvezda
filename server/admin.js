import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, requireAdmin } from './middleware.js';

const router = express.Router();

// Get all users with their subscriptions
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Fetch users from our custom table (not supabase.auth.users as we can't easily list those)
        // Actually, in our setup we usually sync users to public.users
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                first_name,
                created_at,
                subscriptions (
                    plan_type,
                    status,
                    current_period_end
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, users });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user subscription manually
router.post('/user/:userId/subscription', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { plan_type } = req.body;

        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 10); // Standard override is long-term

        const subData = {
            user_id: userId,
            plan_type: plan_type,
            status: 'active',
            current_period_end: expiryDate.toISOString()
        };

        const { error } = await supabase
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id' });

        if (error) throw error;

        // Also update is_premium flag in users table
        await supabase
            .from('users')
            .update({ is_premium: plan_type !== 'free' })
            .eq('id', userId);

        res.json({ success: true, message: `User plan updated to ${plan_type}` });
    } catch (error) {
        console.error('Admin Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
