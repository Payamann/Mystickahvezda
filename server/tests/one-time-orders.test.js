import {
    attachStripeSessionToOrderInput,
    createOneTimeOrderInput,
    getOneTimeOrderInput,
    markOneTimeOrderInputFulfilled,
    sanitizeOneTimePurchaseMetadata
} from '../services/one-time-orders.js';

describe('One-time order inputs', () => {
    test('sanitizeOneTimePurchaseMetadata keeps only non-sensitive Stripe metadata keys', () => {
        const sanitized = sanitizeOneTimePurchaseMetadata({
            productType: 'rocni_horoskop',
            productId: 'rocni_horoskop_2026',
            productYear: '2026',
            orderId: 'order-123',
            source: 'pricing',
            price: '19900',
            currency: 'czk',
            email: 'test@example.com',
            customerName: 'Test User',
            birthDate: '1990-01-01',
            sign: 'beran'
        });

        expect(sanitized).toEqual({
            productType: 'rocni_horoskop',
            productId: 'rocni_horoskop_2026',
            productYear: '2026',
            orderId: 'order-123',
            source: 'pricing',
            price: '19900',
            currency: 'czk'
        });
    });

    test('one-time sensitive inputs are stored separately and can be fulfilled', async () => {
        const order = await createOneTimeOrderInput({
            productType: 'personal_map',
            productId: 'osobni_mapa_2026',
            customerEmail: 'Test@Example.com',
            customerName: 'Test User',
            payload: {
                birthDate: '1990-01-01',
                birthTime: '12:30',
                birthPlace: 'Praha',
                ignored: null
            }
        });

        expect(order.id).toBeTruthy();
        await expect(attachStripeSessionToOrderInput(order.id, 'cs_test_123')).resolves.toBe(true);

        const loaded = await getOneTimeOrderInput(order.id);
        expect(loaded).toMatchObject({
            id: order.id,
            product_type: 'personal_map',
            product_id: 'osobni_mapa_2026',
            customer_email: 'test@example.com',
            customer_name: 'Test User',
            payload: {
                birthDate: '1990-01-01',
                birthTime: '12:30',
                birthPlace: 'Praha'
            }
        });

        await expect(markOneTimeOrderInputFulfilled(order.id)).resolves.toBe(true);
    });
});
