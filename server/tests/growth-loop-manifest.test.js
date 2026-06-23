import request from 'supertest';
import app from '../index.js';
import {
    CORE_FUNNEL_EVENTS,
    FEATURE_CATALOG,
    FEATURE_PLAN_MAP,
    getPublicGrowthLoopManifest,
    NORTH_STAR,
    PRODUCT_CATALOG,
    TRACKING_PAYLOAD_KEYS
} from '../config/growth-loop.js';

describe('Growth loop manifest', () => {
    test('defines the conversion tracking contract for the 90-day plan', () => {
        expect(TRACKING_PAYLOAD_KEYS).toEqual([
            'source',
            'feature',
            'product_id',
            'plan_id',
            'entry_source',
            'entry_feature',
            'intent',
            'variant',
            'step'
        ]);

        expect(NORTH_STAR.requiredEvents).toEqual(expect.arrayContaining([
            'first_value_completed',
            'activation_completed',
            'reading_save_clicked',
            'reading_saved',
            'daily_ritual_completed',
            'paywall_viewed',
            'pricing_plan_cta_clicked',
            'checkout_session_requested',
            'checkout_session_created',
            'subscription_checkout_completed',
            'one_time_purchase_completed'
        ]));

        expect(CORE_FUNNEL_EVENTS).toEqual(expect.arrayContaining(NORTH_STAR.requiredEvents));
    });

    test('covers the main product clusters with recommended paid paths', () => {
        [
            'daily_guidance',
            'tarot',
            'tarot_yes_no',
            'numerologie_vyklad',
            'natalni_interpretace',
            'partnerska_detail',
            'runy_hluboky_vyklad',
            'andelske_karty_hluboky_vhled',
            'kristalova_koule',
            'minuly_zivot',
            'shamanske_kolo_plne_cteni',
            'rituals',
            'mentor'
        ].forEach((featureId) => {
            expect(FEATURE_CATALOG[featureId]).toEqual(expect.objectContaining({
                id: featureId,
                primaryPath: expect.stringMatching(/^\/.+/),
                recommendedPlanId: expect.any(String),
                freeValue: expect.any(String),
                premiumValue: expect.any(String)
            }));
            expect(FEATURE_PLAN_MAP[featureId]).toBeTruthy();
        });

        expect(FEATURE_PLAN_MAP.astrocartography).toBe('osviceni');
        expect(FEATURE_PLAN_MAP.tarot_celtic_cross).toBe('vip-majestrat');
        expect(PRODUCT_CATALOG.rocni_horoskop_2026.productType).toBe('one_time');
        expect(PRODUCT_CATALOG.premium_membership.primaryPlanId).toBe('pruvodce');
    });

    test('GET /api/growth-loop exposes only public growth metadata', async () => {
        const res = await request(app)
            .get('/api/growth-loop')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.version).toBe(getPublicGrowthLoopManifest().version);
        expect(res.body.trackingPayloadKeys).toEqual(TRACKING_PAYLOAD_KEYS);
        expect(res.body.features).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'daily_guidance',
                primaryPath: '/horoskopy.html',
                recommendedPlanId: 'pruvodce'
            })
        ]));
        expect(res.body.products).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'premium_membership',
                primaryPlanId: 'pruvodce'
            })
        ]));
        expect(JSON.stringify(res.body)).not.toMatch(/STRIPE|SECRET|SERVICE_ROLE|ANTHROPIC/i);
    });
});
