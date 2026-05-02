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
    sendPersonalMapLifecycleSequence
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

        const firstPayload = JSON.parse(queued[0].data);
        expect(firstPayload).toMatchObject({
            orderId: 'order-email-sequence-test',
            productId: 'osobni_mapa_2026',
            source: 'personal_map_checkout',
            stripeSessionId: 'cs_test_lifecycle'
        });
        expect(firstPayload.focus).toBeUndefined();
    });

    test('converts html links into readable plain text', () => {
        expect(htmlToPlainText('<p>Ahoj <strong>světe</strong></p><a href="https://example.com">Otevřít &rarr;</a>'))
            .toBe('Ahoj světe\nOtevřít → (https://example.com)');
    });
});
