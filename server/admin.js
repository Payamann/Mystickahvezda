import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, requireAdmin } from './middleware.js';

const router = express.Router();

// Get all users with their subscriptions (with pagination)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;

        // Fetch users with pagination
        const { data: users, error, count } = await supabase
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
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst uživatele.' });
    }
});

// Update user subscription manually
router.post('/user/:userId/subscription', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { plan_type } = req.body;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            return res.status(400).json({ success: false, error: 'Neplatné ID uživatele.' });
        }

        if (!plan_type || typeof plan_type !== 'string') {
            return res.status(400).json({ success: false, error: 'Typ plánu je povinný.' });
        }

        // Set expiry based on plan type
        const expiryDate = new Date();
        if (plan_type.includes('yearly')) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else if (plan_type === 'free') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        console.log(`[ADMIN] Subscription override: user=${userId}, plan=${plan_type}, expires=${expiryDate.toISOString()}, by admin=${req.user.email}`);

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
        res.status(500).json({ success: false, error: 'Nepodařilo se aktualizovat předplatné.' });
    }
});

export default router;
