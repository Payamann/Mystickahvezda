import {
    buildPersonalMapFallbackSections,
    buildPersonalMapGenerationPrompt,
    buildPersonalMapHtml,
    renderPersonalMapPdf,
    samplePersonalMapData
} from '../services/personal-map-pdf.js';

describe('personal map PDF service', () => {
    test('buildPersonalMapGenerationPrompt creates a strict Czech JSON prompt', () => {
        const prompt = buildPersonalMapGenerationPrompt({
            name: 'Jana',
            birthDate: '1994-10-08',
            sign: 'vahy',
            focus: 'vztahy a práce',
            year: 2026
        });

        expect(prompt.system).toContain('česká autorka');
        expect(prompt.user).toContain('Osobní mapa zbytku roku 2026');
        expect(prompt.user).toContain('Jana');
        expect(prompt.user).toContain('Vrať pouze validní JSON bez markdownu');
        expect(prompt.user).toContain('"essence"');
        expect(prompt.user).toContain('"actionPlan"');
    });

    test('buildPersonalMapHtml renders premium PDF HTML and escapes user input', () => {
        const html = buildPersonalMapHtml({
            ...samplePersonalMapData,
            name: '<script>alert(1)</script>',
            focus: 'láska <img src=x onerror=alert(1)>'
        });

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Osobní mapa zbytku roku');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('láska &lt;img src=x onerror=alert(1)&gt;');
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).not.toContain('<img src=x onerror=alert(1)>');
    });

    test('buildPersonalMapFallbackSections returns complete personalized fallback content', () => {
        const sections = buildPersonalMapFallbackSections({
            name: 'Pavel',
            sign: 'rak',
            focus: 'ověření doručení PDF',
            year: 2026
        });

        expect(sections.starSignature.text).toContain('Pavel');
        expect(sections.starSignature.text).toContain('2026');
        expect(sections.starSignature.text).toContain('ověření doručení PDF');
        expect(sections.essence).toHaveLength(4);
        expect(sections.months).toHaveLength(5);
        expect(sections.actionPlan).toHaveLength(5);
        expect(sections.journalPrompts).toHaveLength(6);
        expect(sections.closing).toContain('Pavel');
    });

    test('renderPersonalMapPdf returns a real PDF buffer', async () => {
        const pdf = await renderPersonalMapPdf(samplePersonalMapData);
        const buffer = Buffer.from(pdf);

        expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
        expect(buffer.length).toBeGreaterThan(50_000);
    }, 30000);
});
