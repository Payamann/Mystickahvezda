import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { callClaude } from './claude.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const SIGN_NAMES = {
    beran: 'Beran', byk: 'Býk', blizenci: 'Blíženci', rak: 'Rak',
    lev: 'Lev', panna: 'Panna', vahy: 'Váhy', stir: 'Štír',
    strelec: 'Střelec', kozoroh: 'Kozoroh', vodnar: 'Vodnář', ryby: 'Ryby'
};

const SIGN_GLYPHS = {
    beran: '♈', byk: '♉', blizenci: '♊', rak: '♋',
    lev: '♌', panna: '♍', vahy: '♎', stir: '♏',
    strelec: '♐', kozoroh: '♑', vodnar: '♒', ryby: '♓'
};

const SECTIONS = [
    { key: 'osobnost', title: 'Osobnost & Duše', icon: '✦' },
    { key: 'laska', title: 'Láska & Vztahy', icon: '♥' },
    { key: 'kariera', title: 'Kariéra & Finance', icon: '◆' },
    { key: 'rust', title: 'Osobní Růst', icon: '✦' },
    { key: 'mesice', title: 'Klíčové Měsíce', icon: '◐' },
    { key: 'slovo', title: `Slovo pro ${new Date().getFullYear()}`, icon: '✧' },
];

/**
 * Calls Claude to generate 6-section personalized horoscope.
 * Returns an object with section keys → text.
 */
export async function generateHoroscopeContent({ name, birthDate, sign }) {
    const signName = SIGN_NAMES[sign] || sign;
    const year = new Date().getFullYear();

    const systemPrompt = `Jsi Mystická Hvězda — prémiová česká astroložka. Píšeš personalizovaný roční horoskop pro konkrétního člověka. Tón: vřelý, přímý, poetický ale konkrétní. Nikdy obecný. Píšeš v češtině, tykáš. Žádné anglicismy.`;

    const userPrompt = `Napiš mi personalizovaný Roční Horoskop na míru ${year} pro:
Jméno: ${name}
Datum narození: ${birthDate}
Znamení: ${signName}

Horoskop musí mít přesně 6 sekcí. Každou sekci začni řádkem SEKCE:[klíč] a text sekce piš rovnou za ním (bez nadpisu). Klíče sekcí jsou přesně: osobnost, laska, kariera, rust, mesice, slovo

Pravidla pro každou sekci:
- osobnost: 120–150 slov. Popiš duši, silné stránky a vnitřní svět. Propoj s datem narození.
- laska: 120–150 slov. Konkrétní vztahová energie roku ${year}. Co přijde, co opatrovat.
- kariera: 120–150 slov. Finanční a kariérní výhled. Kdy riskovat, kdy šetřit.
- rust: 100–120 slov. Nejdůležitější lekce a transformace roku.
- mesice: Vypiš 4–5 konkrétních měsíců roku ${year} s krátkým popisem energie (1–2 věty každý).
- slovo: 80–100 slov. Závěrečné povzbuzení — osobní, poetické, silné. Nes ${name} jako jednotlivce.

Piš výhradně v češtině. Nepiš nadpisy sekcí, jen SEKCE:[klíč] a pak text.`;

    const raw = await callClaude(systemPrompt, userPrompt, null, {
        feature: 'annual_horoscope_pdf'
    });
    return parseSections(raw);
}

function parseSections(raw) {
    const result = {};
    const regex = /SEKCE:(\w+)\s*([\s\S]*?)(?=SEKCE:\w+|$)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
        result[match[1].trim()] = match[2].trim();
    }
    return result;
}

/**
 * Renders the horoscope HTML and converts to PDF buffer via Playwright.
 */
export async function renderPdf({ name, sign, birthDate, sections }) {
    const signName = SIGN_NAMES[sign] || sign;
    const glyph = SIGN_GLYPHS[sign] || '✦';
    const year = new Date().getFullYear();
    const birthFormatted = new Date(birthDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

    const html = buildHtml({ name, signName, glyph, year, birthFormatted, sections });

    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();
    return pdfBuffer;
}

function buildHtml({ name, signName, glyph, year, birthFormatted, sections }) {
    const sectionHtml = SECTIONS.map(({ key, title, icon }) => {
        const text = sections[key] || '';
        const isMonths = key === 'mesice';
        const formattedText = isMonths
            ? formatMonths(text)
            : `<p>${text.replace(/\n+/g, '</p><p>')}</p>`;

        return `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">${icon}</span>
                <h2 class="section-title">${title}</h2>
                <span class="section-icon">${icon}</span>
            </div>
            <div class="section-divider"></div>
            <div class="section-body">${formattedText}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #06061a;
    color: #e8e0d0;
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 13.5pt;
    line-height: 1.75;
  }

  /* ── COVER PAGE ── */
  .cover {
    width: 210mm;
    height: 297mm;
    background: radial-gradient(ellipse at 50% 30%, #1a1050 0%, #0a0820 50%, #06061a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  .cover::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 20%, rgba(212,175,55,0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139,90,180,0.08) 0%, transparent 50%);
  }

  .cover-ornament-top {
    font-family: 'Cinzel', serif;
    font-size: 11pt;
    letter-spacing: 6px;
    color: rgba(212,175,55,0.5);
    text-transform: uppercase;
    margin-bottom: 48px;
  }

  .cover-glyph {
    font-size: 88pt;
    color: #d4af37;
    text-shadow: 0 0 60px rgba(212,175,55,0.4), 0 0 120px rgba(212,175,55,0.15);
    line-height: 1;
    margin-bottom: 32px;
  }

  .cover-brand {
    font-family: 'Cinzel', serif;
    font-size: 11pt;
    letter-spacing: 5px;
    color: rgba(212,175,55,0.65);
    text-transform: uppercase;
    margin-bottom: 56px;
  }

  .cover-title {
    font-family: 'Cinzel', serif;
    font-size: 28pt;
    font-weight: 700;
    color: #f5ead0;
    letter-spacing: 3px;
    text-align: center;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .cover-year {
    font-family: 'Cinzel', serif;
    font-size: 18pt;
    color: #d4af37;
    letter-spacing: 8px;
    margin-bottom: 64px;
  }

  .cover-divider {
    width: 180px;
    height: 1px;
    background: linear-gradient(to right, transparent, #d4af37, transparent);
    margin-bottom: 40px;
  }

  .cover-name {
    font-family: 'Cinzel', serif;
    font-size: 16pt;
    color: #e8e0d0;
    letter-spacing: 3px;
    text-align: center;
    margin-bottom: 10px;
  }

  .cover-sign {
    font-size: 12pt;
    color: rgba(212,175,55,0.7);
    letter-spacing: 2px;
    font-style: italic;
  }

  .cover-birth {
    margin-top: 6px;
    font-size: 10.5pt;
    color: rgba(232,224,208,0.45);
    letter-spacing: 1px;
  }

  .cover-footer {
    position: absolute;
    bottom: 36px;
    font-size: 8.5pt;
    color: rgba(212,175,55,0.3);
    letter-spacing: 3px;
    text-transform: uppercase;
    font-family: 'Cinzel', serif;
  }

  /* ── CONTENT PAGES ── */
  .content {
    padding: 20mm 18mm;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10mm;
    padding-bottom: 4mm;
    border-bottom: 1px solid rgba(212,175,55,0.2);
  }

  .page-header-name {
    font-family: 'Cinzel', serif;
    font-size: 8pt;
    letter-spacing: 3px;
    color: rgba(212,175,55,0.6);
    text-transform: uppercase;
  }

  .page-header-glyph {
    font-size: 14pt;
    color: rgba(212,175,55,0.4);
  }

  .section {
    margin-bottom: 12mm;
    page-break-inside: avoid;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 3mm;
  }

  .section-icon {
    color: #d4af37;
    font-size: 10pt;
    opacity: 0.7;
  }

  .section-title {
    font-family: 'Cinzel', serif;
    font-size: 13pt;
    font-weight: 600;
    color: #d4af37;
    letter-spacing: 2px;
    text-transform: uppercase;
    flex: 1;
    text-align: center;
  }

  .section-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent);
    margin-bottom: 5mm;
  }

  .section-body p {
    margin-bottom: 6pt;
    color: #ddd5c8;
  }

  /* Months list */
  .month-item {
    display: flex;
    gap: 12px;
    margin-bottom: 8pt;
    align-items: flex-start;
  }

  .month-label {
    font-family: 'Cinzel', serif;
    font-size: 9.5pt;
    color: #d4af37;
    letter-spacing: 1px;
    min-width: 80px;
    padding-top: 2px;
  }

  .month-text {
    color: #ddd5c8;
    flex: 1;
    font-size: 12pt;
  }

  /* Last section — closing word — centered italic */
  .section.slovo .section-body {
    text-align: center;
    font-style: italic;
    color: #e8dfc8;
    font-size: 13pt;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-ornament-top">Mystická Hvězda · ${year}</div>
  <div class="cover-glyph">${glyph}</div>
  <div class="cover-brand">mystickahvezda.cz</div>
  <div class="cover-title">Roční Horoskop<br>na míru</div>
  <div class="cover-year">${year}</div>
  <div class="cover-divider"></div>
  <div class="cover-name">${name}</div>
  <div class="cover-sign">${signName}</div>
  <div class="cover-birth">${birthFormatted}</div>
  <div class="cover-footer">Personalizovaný výklad · Mystická Hvězda</div>
</div>

<!-- CONTENT -->
<div class="content">
  <div class="page-header">
    <div class="page-header-name">${name} · ${signName}</div>
    <div class="page-header-glyph">${glyph}</div>
    <div class="page-header-name">Roční Horoskop ${year}</div>
  </div>

  ${sectionHtml}
</div>

</body>
</html>`;
}

function formatMonths(text) {
    // Try to parse "Měsíc: text" lines
    const lines = text.split('\n').filter(l => l.trim());
    const monthPattern = /^([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+\d{4})?)[:\-–]\s*(.+)/;
    const parsed = lines.map(line => {
        const m = monthPattern.exec(line.trim());
        if (m) {
            return `<div class="month-item"><span class="month-label">${m[1]}</span><span class="month-text">${m[2]}</span></div>`;
        }
        return `<p>${line}</p>`;
    });
    return parsed.join('');
}
