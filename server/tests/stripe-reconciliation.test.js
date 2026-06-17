import { inferPlanFromStripeSubscription } from '../../scripts/reconcile-stripe-subscriptions.mjs';

function subscription(overrides = {}) {
    return {
        metadata: {},
        items: { data: [] },
        ...overrides,
    };
}

describe('Stripe subscription reconciliation helpers', () => {
    test('prefers explicit subscription metadata planType', () => {
        const result = inferPlanFromStripeSubscription(subscription({
            metadata: {
                planType: 'exclusive_monthly',
                planId: 'osviceni',
            },
            items: {
                data: [{ price: { id: 'price_unknown' } }],
            },
        }));

        expect(result).toEqual(expect.objectContaining({
            planId: 'osviceni',
            planType: 'exclusive_monthly',
            source: 'subscription.metadata.planType',
            priceId: 'price_unknown',
        }));
        expect(result.warnings).toEqual([]);
    });

    test('maps configured Stripe price id to internal plan type', () => {
        const result = inferPlanFromStripeSubscription(subscription({
            metadata: {},
            items: {
                data: [{ price: { id: 'price_live_pruvodce_monthly' } }],
            },
        }), {
            priceIdPlanMap: new Map([
                ['price_live_pruvodce_monthly', 'pruvodce'],
            ]),
        });

        expect(result).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            planType: 'premium_monthly',
            source: 'price.id',
            priceId: 'price_live_pruvodce_monthly',
        }));
        expect(result.warnings).toEqual([]);
    });

    test('falls back to default premium plan when Stripe metadata and price are unknown', () => {
        const result = inferPlanFromStripeSubscription(subscription({
            metadata: {},
            items: {
                data: [{ price: { id: 'price_unmapped' } }],
            },
        }), {
            priceIdPlanMap: new Map(),
        });

        expect(result).toEqual(expect.objectContaining({
            planId: null,
            planType: 'premium_monthly',
            source: 'fallback',
            priceId: 'price_unmapped',
        }));
        expect(result.warnings[0]).toMatch(/Could not map Stripe price/i);
    });
});
