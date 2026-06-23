import { test, expect } from '@playwright/test';

async function fetchHtml(request, pagePath) {
    const response = await request.get(pagePath);
    expect(response.status(), `${pagePath} should be served`).toBe(200);
    return response.text();
}

function titleOf(html) {
    const match = html.match(/<title>([^<]+)<\/title>/i);
    expect(match, 'document title should exist').not.toBeNull();
    return match[1];
}

test.describe('CTR SEO sprint smoke', () => {
    test('/horoskop/beran.html matches Aries intent and measured natal CTA', async ({ request }) => {
        const html = await fetchHtml(request, '/horoskop/beran.html');

        expect(titleOf(html)).toMatch(/Aries znamení česky: Beran/);
        expect(html).toContain('Beran je Aries, první znamení zvěrokruhu');
        expect(html).toContain('href="../natalni-karta.html?source=seo_zodiac_sign&feature=natal_chart&sign=beran"');
        expect(html).toContain('Vygenerovat Natální kartu');
    });

    test('/andelske-karty.html separates daily angel card from deeper reading', async ({ request }) => {
        const html = await fetchHtml(request, '/andelske-karty.html');

        expect(titleOf(html)).toMatch(/Andělská karta dne zdarma/);
        expect(html).toContain('Andělská <span class="text-gradient">karta dne</span>');
        expect(html).toContain('id="draw-btn"');
        expect(html).toContain('aria-label="Vytáhnout andělskou kartu"');
        expect(html).toContain('Jaký je rozdíl mezi kartou dne a andělským výkladem?');
    });

    for (const slug of [
        'sagittarius-pisces',
        'aquarius-taurus',
        'capricorn-leo',
        'virgo-leo',
        'leo-scorpio',
        'aries-virgo',
        'cancer-aquarius',
        'scorpio-pisces',
        'gemini-sagittarius',
    ]) {
        test(`/partnerska-shoda/${slug}.html keeps measured pair CTA`, async ({ request }) => {
            const html = await fetchHtml(request, `/partnerska-shoda/${slug}.html`);

            expect(titleOf(html)).toMatch(/láska, vztah a kompatibilita/);
            expect(html).toContain(`href="../partnerska-shoda.html?source=seo_partner_pair&feature=compatibility&pair=${slug}#form"`);
            expect(html).toContain('Vypočítat Synastrii Zdarma');
        });
    }

    for (const [pagePath, titleIntent, visibleIntent] of [
        ['/sk/kristalova-koule.html', 'Krištáľová guľa áno nie online', 'Krištáľová guľa áno alebo nie'],
        ['/pl/kristalova-koule.html', 'Kryształowa kula tak czy nie', 'Kryształowa kula tak czy nie'],
    ]) {
        test(`${pagePath} keeps yes-no intent and hreflang`, async ({ request }) => {
            const html = await fetchHtml(request, pagePath);

            expect(titleOf(html)).toMatch(new RegExp(titleIntent));
            expect(html).toContain(visibleIntent);
            expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="cs"[^>]+href="[^"]*kristalova-koule\.html"/i);
            expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="sk"[^>]+href="[^"]*sk\/kristalova-koule\.html"/i);
            expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="pl"[^>]+href="[^"]*pl\/kristalova-koule\.html"/i);
        });
    }
});
