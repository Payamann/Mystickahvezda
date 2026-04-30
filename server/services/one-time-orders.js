import { randomUUID } from 'node:crypto';
import { supabase } from '../db-supabase.js';

const VALID_PRODUCT_TYPES = new Set(['rocni_horoskop', 'personal_map']);
const SAFE_METADATA_KEYS = new Set([
    'productType',
    'productId',
    'productYear',
    'source',
    'price',
    'currency',
    'orderId'
]);

function cleanString(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function normalizePayload(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(payload)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [
                cleanString(key, 80),
                typeof value === 'string' ? cleanString(value, 1000) : value
            ])
            .filter(([key]) => key)
    );
}

export function sanitizeOneTimePurchaseMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== 'object') return {};

    return Object.fromEntries(
        Object.entries(metadata)
            .filter(([key]) => SAFE_METADATA_KEYS.has(key))
            .map(([key, value]) => [key, typeof value === 'string' ? cleanString(value, 200) : value])
    );
}

export async function createOneTimeOrderInput({
    productType,
    productId,
    customerEmail,
    customerName,
    payload
}) {
    if (!VALID_PRODUCT_TYPES.has(productType)) {
        throw new Error('Invalid one-time product type.');
    }

    const id = randomUUID();
    const record = {
        id,
        product_type: productType,
        product_id: cleanString(productId, 120),
        customer_email: cleanString(customerEmail, 254).toLowerCase(),
        customer_name: cleanString(customerName, 120),
        payload: normalizePayload(payload),
        status: 'checkout_created',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('one_time_order_inputs')
        .insert(record)
        .select('id')
        .single();

    if (error) throw error;
    return data || { id };
}

export async function attachStripeSessionToOrderInput(orderId, stripeSessionId) {
    if (!orderId || !stripeSessionId) return false;

    const { error } = await supabase
        .from('one_time_order_inputs')
        .update({
            stripe_session_id: stripeSessionId,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (error) {
        console.warn('[ONE_TIME_ORDER] Could not attach Stripe session:', error.message);
        return false;
    }

    return true;
}

export async function getOneTimeOrderInput(orderId) {
    const cleanOrderId = cleanString(orderId, 80);
    if (!cleanOrderId) return null;

    const { data, error } = await supabase
        .from('one_time_order_inputs')
        .select('id, product_type, product_id, customer_email, customer_name, payload')
        .eq('id', cleanOrderId)
        .maybeSingle();

    if (error) {
        console.warn('[ONE_TIME_ORDER] Could not load order input:', error.message);
        return null;
    }

    return data || null;
}

export async function markOneTimeOrderInputFulfilled(orderId) {
    const cleanOrderId = cleanString(orderId, 80);
    if (!cleanOrderId) return false;

    const { error } = await supabase
        .from('one_time_order_inputs')
        .update({
            status: 'fulfilled',
            fulfilled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', cleanOrderId);

    if (error) {
        console.warn('[ONE_TIME_ORDER] Could not mark order fulfilled:', error.message);
        return false;
    }

    return true;
}
