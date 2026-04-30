import {
    buildPersonalMapFallbackSections,
    buildPersonalMapGenerationPrompt,
    buildPersonalMapHtml,
    generatePersonalMapContent,
    renderPersonalMapPdf,
    samplePersonalMapData
} from '../services/personal-map-pdf.js';

function flattenSections(sections) {
    return JSON.stringify(sections);
}

function stripHtml(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
}

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
            grammaticalGender: 'masculine',
            year: 2026
        });
        const text = flattenSections(sections);

        expect(sections.starSignature.text).toContain('Pavel');
        expect(sections.starSignature.text).toContain('2026');
        expect(sections.starSignature.text).toContain('ověření doručení PDF');
        expect(text).toContain('Rak');
        expect(text).not.toContain('Jana');
        expect(text).not.toContain('Váhy');
        expect(text).not.toMatch(/\b(vyrovnaná|laskavá|pravdivá|sama|zůstala)\b/i);
        expect(text).not.toMatch(/\b(AI|záložní|náhradní|selže)\b/i);
        expect(sections.essence).toHaveLength(4);
        expect(sections.months).toHaveLength(5);
        expect(sections.actionPlan).toHaveLength(5);
        expect(sections.journalPrompts).toHaveLength(6);
        expect(sections.closing).toContain('Pavel');
    });

    test('generatePersonalMapContent keeps mock/test content tied to requested identity', async () => {
        const previousMockAi = process.env.MOCK_AI;
        process.env.MOCK_AI = 'true';

        try {
            const sections = await generatePersonalMapContent({
                name: 'Pavel',
                sign: 'rak',
                focus: 'ověření doručení PDF',
                grammaticalGender: 'masculine',
                year: 2026
            });
            const text = flattenSections(sections);

            expect(text).toContain('Pavel');
            expect(text).toContain('Rak');
            expect(text).toContain('ověření doručení PDF');
            expect(text).not.toContain('Jana');
            expect(text).not.toContain('Jano');
            expect(text).not.toContain('Váhy');
            expect(text).not.toMatch(/\b(vyrovnaná|laskavá|pravdivá|sama|zůstala)\b/i);
        } finally {
            if (previousMockAi === undefined) {
                delete process.env.MOCK_AI;
            } else {
                process.env.MOCK_AI = previousMockAi;
            }
        }
    });

    test('buildPersonalMapHtml does not leak feminine template copy for masculine fallback content', () => {
        const sections = buildPersonalMapFallbackSections({
            name: 'Pavel',
            sign: 'rak',
            focus: 'ověření doručení PDF',
            grammaticalGender: 'masculine',
            year: 2026
        });
        const html = buildPersonalMapHtml({
            name: 'Pavel',
            sign: 'rak',
            birthDate: '1989-07-15',
            focus: 'ověření doručení PDF',
            year: 2026,
            productName: 'Osobní mapa zbytku roku 2026',
            sections
        });
        const text = stripHtml(html);

        expect(text).toContain('Pavel');
        expect(text).toContain('Rak');
        expect(text).not.toContain('Jana');
        expect(text).not.toContain('Váhy');
        expect(text).not.toMatch(/\b(vyrovnaná|laskavá|pravdivá|sama|zůstala)\b/i);
    });

    test('renderPersonalMapPdf returns a real PDF buffer', async () => {
        const pdf = await renderPersonalMapPdf(samplePersonalMapData);
        const buffer = Buffer.from(pdf);

        expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
        expect(buffer.length).toBeGreaterThan(50_000);
    }, 30000);
});
