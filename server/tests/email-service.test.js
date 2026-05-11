import { jest } from '@jest/globals';

const sendMock = jest.fn();

delete process.env.FROM_EMAIL;
delete process.env.REPLY_TO_EMAIL;
process.env.APP_URL = 'https://yourdomain.com';

jest.unstable_mockModule('resend', () => ({
    Resend: jest.fn(() => ({
        emails: {
            send: sendMock
        }
    }))
}));

const {
    sendEmail,
    htmlToPlainText,
    sendPersonalMapLifecycleSequence,
    sendAnnualHoroscopeLifecycleSequence,
    sendActivationLifecycleSequence
} = await import('../email-service.js');
const { supabase } = await import('../db-supabase.js');

describe('Email service deliverability payload', () => {
    beforeEach(() => {
        sendMock.mockReset();
        sendMock.mockResolvedValue({ data: { id: 'email_test_123' }, error: null });
    });

    test('adds plain-text alternative and friendly from name', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'feature_weekly',
            data: {
                feature_title: 'Test funkce',
                feature_description: 'Krátký popis testovací funkce.',
                benefits: ['První výhoda', 'Druhá výhoda']
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.from).toBe('Mysticka Hvezda <noreply@mystickahvezda.cz>');
        expect(payload.to).toBe('recipient@example.com');
        expect(payload.html).toContain('Test funkce');
        expect(payload.text).toContain('Test funkce');
        expect(payload.text).not.toMatch(/<[^>]+>/);
    });

    test('keeps real unsubscribe header for daily horoscope emails', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'daily_horoscope',
            data: {
                sign: 'Beran',
                date: 'úterý 28. dubna 2026',
                token: 'token with spaces',
                horoscope_text: 'Dnes se drž jednoduchého kroku.'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.headers['List-Unsubscribe']).toBe('<https://yourdomain.com/api/subscribe/horoscope/unsubscribe?token=token%20with%20spaces>');
    });

    test('builds daily horoscope with safer content, preheader and plain text', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'daily_horoscope',
            data: {
                sign: 'Beran',
                date: 'úterý 28. dubna 2026',
                token: 'daily-token',
                horoscope_text: 'První vedení pro den.\nDruhý řádek.\n\n<script>alert(1)</script>'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.subject).toBe('Tvůj denní horoskop: Beran');
        expect(payload.html).toContain('Krátké ranní vedení pro znamení Beran');
        expect(payload.html).toContain('První vedení pro den.<br>Druhý řádek.');
        expect(payload.html).not.toContain('<script>alert(1)</script>');
        expect(payload.html).not.toContain('alert(1)');
        expect(payload.text).toContain('První vedení pro den.');
        expect(payload.text).not.toContain('alert(1)');
        expect(payload.text).not.toContain('&rarr;');
        expect(payload.text).toContain('Odhlásit se z odběru');
    });

    test('adds unsubscribe headers to horoscope confirmation emails', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'horoscope_subscription_confirm',
            data: {
                sign: 'Rak',
                token: 'confirm-token'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.subject).toBe('Odběr denního horoskopu potvrzen');
        expect(payload.headers['List-Unsubscribe']).toBe('<https://yourdomain.com/api/subscribe/horoscope/unsubscribe?token=confirm-token>');
        expect(payload.html).toContain('Odběr je aktivní');
        expect(payload.html).not.toContain('undefined');
    });

    test('renders personal map upsell email with tracked pricing link and escaped customer data', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'personal_map_pruvodce_day3',
            data: {
                name: 'Jana <script>alert(1)</script>',
                sign: 'lev',
                productId: 'osobni_mapa_2026'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.html).toContain('source=personal_map_email_day3');
        expect(payload.html).toContain('plan=pruvodce');
        expect(payload.html).not.toContain('<script>');
        expect(payload.html).not.toContain('alert(1)');
        expect(payload.text).toContain('Odemknout');
    });

    test('renders annual horoscope upsell email with tracked pricing link and escaped customer data', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'annual_horoscope_pruvodce_day3',
            data: {
                name: 'Jana <script>alert(1)</script>',
                sign: 'lev',
                productId: 'rocni_horoskop_2026',
                year: '2026'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.html).toContain('source=annual_horoscope_email_day3');
        expect(payload.html).toContain('plan=pruvodce');
        expect(payload.html).toContain('feature=premium_membership');
        expect(payload.html).not.toContain('<script>');
        expect(payload.html).not.toContain('alert(1)');
        expect(payload.text).toContain('Odemknout');
    });

    test('renders activation email with same-origin tracked link only', async () => {
        const unsafeDestination = ['java', 'script:alert(1)'].join('');

        await sendEmail({
            to: 'recipient@example.com',
            template: 'activation_first_step_day0',
            data: {
                name: 'Jana <script>alert(1)</script>',
                source: 'life_number_result',
                feature: 'numerologie_vyklad',
                destination: unsafeDestination
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.html).toContain('https://yourdomain.com/numerologie.html');
        expect(payload.html).toContain('utm_campaign=activation_day0');
        expect(payload.html).toContain('entry_source=life_number_result');
        expect(payload.html).not.toContain(['java', 'script:'].join(''));
        expect(payload.html).not.toContain('<script>');
        expect(payload.html).not.toContain('alert(1)');
    });

    test('renders activation day 6 one-time offer with product attribution', async () => {
        await sendEmail({
            to: 'recipient@example.com',
            template: 'activation_one_time_offer_day6',
            data: {
                name: 'Jana <script>alert(1)</script>',
                source: 'life_number_result',
                feature: 'numerologie_vyklad'
            }
        });

        const payload = sendMock.mock.calls[0][0];
        expect(payload.subject).toBe('Jeden další krok bez předplatného');
        expect(payload.html).toContain('https://yourdomain.com/osobni-mapa.html');
        expect(payload.html).toContain('utm_campaign=activation_day6_offer');
        expect(payload.html).toContain('feature=osobni_mapa_2026');
        expect(payload.html).toContain('entry_feature=numerologie_vyklad');
        expect(payload.html).not.toContain('<script>');
        expect(payload.html).not.toContain('alert(1)');
        expect(payload.text).toContain('jednorázově');
    });

    test('schedules anonymous personal map lifecycle without sensitive form focus', async () => {
        await sendPersonalMapLifecycleSequence({
            orderId: 'order-email-sequence-test',
            email: 'buyer-lifecycle@example.com',
            name: 'Jana',
            sign: 'lev',
            productId: 'osobni_mapa_2026',
            source: 'personal_map_checkout',
            stripeSessionId: 'cs_test_lifecycle',
            delays: {
                reflectionDay1: 60,
                pruvodceDay3: 120
            }
        });

        const { data: queued } = await supabase
            .from('email_queue')
            .select('*')
            .eq('email_to', 'buyer-lifecycle@example.com')
            .order('scheduled_for', { ascending: true });

        expect(queued).toHaveLength(2);
        expect(queued.map(email => email.template)).toEqual([
            'personal_map_reflection_day1',
            'personal_map_pruvodce_day3'
        ]);
        expect(queued.every(email => email.user_id === null)).toBe(true);

        const firstPayload = typeof queued[0].data === 'string'
            ? JSON.parse(queued[0].data)
            : queued[0].data;
        expect(firstPayload).toMatchObject({
            orderId: 'order-email-sequence-test',
            productId: 'osobni_mapa_2026',
            source: 'personal_map_checkout',
            stripeSessionId: 'cs_test_lifecycle'
        });
        expect(firstPayload.focus).toBeUndefined();
    });

    test('schedules annual horoscope lifecycle with order context only', async () => {
        const email = `annual-buyer-${Date.now()}@example.com`;

        const firstSchedule = await sendAnnualHoroscopeLifecycleSequence({
            orderId: 'order-annual-sequence-test',
            email,
            name: 'Jana',
            sign: 'lev',
            productId: 'rocni_horoskop_2026',
            year: '2026',
            source: 'annual_horoscope_checkout',
            stripeSessionId: 'cs_test_annual_lifecycle',
            delays: {
                reflectionDay1: 60,
                pruvodceDay3: 120
            }
        });
        const duplicateSchedule = await sendAnnualHoroscopeLifecycleSequence({
            orderId: 'order-annual-sequence-test',
            email,
            name: 'Jana',
            sign: 'lev',
            productId: 'rocni_horoskop_2026',
            year: '2026',
            source: 'annual_horoscope_checkout',
            stripeSessionId: 'cs_test_annual_lifecycle',
            delays: {
                reflectionDay1: 60,
                pruvodceDay3: 120
            }
        });

        const { data: queued } = await supabase
            .from('email_queue')
            .select('*')
            .eq('email_to', email)
            .order('scheduled_for', { ascending: true });

        expect(firstSchedule).toMatchObject({ success: true, scheduled: 2, skipped: 0 });
        expect(duplicateSchedule).toMatchObject({ success: true, scheduled: 0, skipped: 2 });
        expect(queued).toHaveLength(2);
        expect(queued.map(emailRecord => emailRecord.template)).toEqual([
            'annual_horoscope_reflection_day1',
            'annual_horoscope_pruvodce_day3'
        ]);
        expect(queued.every(emailRecord => emailRecord.user_id === null)).toBe(true);

        const firstPayload = typeof queued[0].data === 'string'
            ? JSON.parse(queued[0].data)
            : queued[0].data;
        expect(firstPayload).toMatchObject({
            orderId: 'order-annual-sequence-test',
            productId: 'rocni_horoskop_2026',
            year: '2026',
            source: 'annual_horoscope_checkout',
            stripeSessionId: 'cs_test_annual_lifecycle'
        });
        expect(firstPayload.dedupeKey).toBe('annual_horoscope:order-annual-sequence-test:reflection_day1');
        expect(firstPayload.birthDate).toBeUndefined();
    });

    test('schedules activation lifecycle from signup intent with dedupe keys', async () => {
        const email = `activation-user-${Date.now()}@example.com`;

        const firstSchedule = await sendActivationLifecycleSequence({
            userId: 'activation-user-1',
            email,
            name: 'Jana',
            source: 'life_number_result',
            feature: 'numerologie_vyklad',
            destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
            delays: {
                day0: 0,
                day1: 60,
                day3: 120,
                day6: 180
            }
        });
        const duplicateSchedule = await sendActivationLifecycleSequence({
            userId: 'activation-user-1',
            email,
            name: 'Jana',
            source: 'life_number_result',
            feature: 'numerologie_vyklad',
            destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
            delays: {
                day0: 0,
                day1: 60,
                day3: 120,
                day6: 180
            }
        });

        const { data: queued } = await supabase
            .from('email_queue')
            .select('*')
            .eq('email_to', email)
            .order('scheduled_for', { ascending: true });

        expect(firstSchedule).toMatchObject({ success: true, scheduled: 4, skipped: 0 });
        expect(duplicateSchedule).toMatchObject({ success: true, scheduled: 0, skipped: 4 });
        expect(queued).toHaveLength(4);
        expect(queued.map(emailRecord => emailRecord.template)).toEqual([
            'activation_first_step_day0',
            'activation_quick_win_day1',
            'activation_depth_day3',
            'activation_one_time_offer_day6'
        ]);
        expect(queued.every(emailRecord => emailRecord.user_id === 'activation-user-1')).toBe(true);

        const firstPayload = typeof queued[0].data === 'string'
            ? JSON.parse(queued[0].data)
            : queued[0].data;
        expect(firstPayload).toMatchObject({
            source: 'life_number_result',
            feature: 'numerologie_vyklad',
            destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
            dedupeKey: 'activation:activation-user-1:day0'
        });

        const day6Payload = typeof queued[3].data === 'string'
            ? JSON.parse(queued[3].data)
            : queued[3].data;
        expect(day6Payload).toMatchObject({
            source: 'life_number_result',
            feature: 'numerologie_vyklad',
            skipIfPremium: true,
            dedupeKey: 'activation:activation-user-1:day6'
        });
    });

    test('converts html links into readable plain text', () => {
        expect(htmlToPlainText('<p>Ahoj <strong>světe</strong></p><a href="https://example.com">Otevřít &rarr;</a>'))
            .toBe('Ahoj světe\nOtevřít → (https://example.com)');
    });
});
