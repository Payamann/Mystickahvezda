import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../..');

async function readPage(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

function extract(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Missing ${label}`);
  }
  return match[1].trim();
}

function expectCoreMetadata(html) {
  const title = extract(html, /<title>([^<]+)<\/title>/i, 'title');
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]+)"\s*>/is, 'meta description');

  expect(title.length).toBeGreaterThanOrEqual(35);
  expect(title.length).toBeLessThanOrEqual(75);
  expect(description.length).toBeGreaterThanOrEqual(80);
  expect(description.length).toBeLessThanOrEqual(170);
  expect(html).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/www\.mystickahvezda\.cz\/[^"]+">/i);
  expect(html).toMatch(/<meta\s+property="og:title"\s+content="[^"]+">/i);
  expect(html).toMatch(/<meta\s+property="og:description"\s+content="[^"]+">/i);
}

describe('CTR sprint static SEO pages', () => {
  it('keeps Beran / Aries optimized for the GSC query intent', async () => {
    const html = await readPage('horoskop/beran.html');

    expectCoreMetadata(html);
    expect(html).toContain('Aries znamení česky: Beran, datum, povaha a láska');
    expect(html).toContain('Beran je Aries, první znamení zvěrokruhu');
    expect(html).toContain('../natalni-karta.html?source=seo_zodiac_sign&feature=natal_chart&sign=beran');
    expect(html).toContain('application/ld+json');
  });

  it('positions angel cards as one clear daily-card action before deeper readings', async () => {
    const html = await readPage('andelske-karty.html');

    expectCoreMetadata(html);
    expect(html).toContain('Andělská karta dne zdarma | 44 andělských karet');
    expect(html).toContain('Andělská <span class="text-gradient">karta dne</span>');
    expect(html).toContain('Jaký je rozdíl mezi kartou dne a andělským výkladem?');
    expect(html).toContain('Vytáhnout andělskou kartu');
    expect(html).toContain('application/ld+json');
  });

  it('keeps tarot yes-no optimized for GSC intent and profile save flow', async () => {
    const html = await readPage('tarot-ano-ne.html');
    const js = await readPage('js/tarot-ano-ne.js');

    expectCoreMetadata(html);
    expect(html).toContain('Tarot ano/ne zdarma | Karty ano ne online');
    expect(html).toContain('Tarot ano/ne zdarma online');
    expect(html).toContain('id="btn-save-reading"');
    expect(html).toContain('Hledáš ano ne tarot, karty ano ne nebo odpověď ano ne?');
    expect(html).toContain('Nejlepší otázka je konkrétní a dnešní');
    expect(html).toContain('Věštba ano ne funguje nejlépe');
    expect(html).toContain('Kam pokračovat');
    expect(html).toContain('Můžu použít karty ano ne jako věštbu?');
    expect(html).toContain('Je to stejné jako karty ano ne?');
    ['reading_start', 'reading_complete', 'save_click', 'reading_save_clicked', 'reading_saved', 'login_click', 'mh_pending_reading'].forEach((needle) => {
      expect(js).toContain(needle);
    });
  });

  it('keeps tarot hubs linking into the yes-no sprint page', async () => {
    const tarotHub = await readPage('tarot.html');
    const tarotFree = await readPage('tarot-zdarma.html');

    expect(tarotHub).toContain('tarot-ano-ne.html?source=tarot_intent_cluster&amp;intent=yes_no');
    expect(tarotHub).toContain('Tarot ano/ne');
    expect(tarotFree).toContain('tarot-ano-ne.html?source=tarot_free_intent&amp;feature=tarot_yes_no&amp;intent=yes_no');
    expect(tarotFree).toContain('Ano ne tarot zdarma');
  });

  it('links high-opportunity horoscope and partner pages from the horoscope hub', async () => {
    const html = await readPage('horoskopy.html');

    expect(html).toContain('id="horoscope-priority-links"');
    expect(html).toContain('Nejhledanější vstupy');
    expect(html).toContain('horoskop/beran.html');
    expect(html).toContain('Beran / Aries: vlastnosti, láska a horoskop');
    expect(html).toContain('partnerska-shoda/sagittarius-pisces.html');
    expect(html).toContain('Střelec a Ryby ve vztahu');
    expect(html).toContain('partnerska-shoda/aquarius-taurus.html');
    expect(html).toContain('Vodnář a Býk ve vztahu');
    expect(html).toContain('partnerska-shoda/capricorn-leo.html');
    expect(html).toContain('partnerska-shoda/virgo-leo.html');
    expect(html).toContain('natalni-karta.html?source=horoscope_priority_links&amp;feature=natal_chart');
    expect(html).toContain('tarot-ano-ne.html?source=horoscope_priority_links&amp;feature=tarot_yes_no&amp;intent=yes_no');
    expect(html).toContain('Tarot ano/ne pro dnešní rozhodnutí');
  });

  it('links priority partner pair pages from the public compatibility hub', async () => {
    const html = await readPage('partnerska-shoda.html');

    expect(html).toContain('id="synastry-priority-links"');
    expect(html).toContain('Nejhledanější dvojice');
    [
      ['partnerska-shoda/sagittarius-pisces.html', 'Střelec a Ryby ve vztahu'],
      ['partnerska-shoda/aquarius-taurus.html', 'Vodnář a Býk ve vztahu'],
      ['partnerska-shoda/capricorn-leo.html', 'Kozoroh a Lev ve vztahu'],
      ['partnerska-shoda/virgo-leo.html', 'Panna a Lev ve vztahu'],
      ['partnerska-shoda/aries-aries.html', 'Beran a Beran ve vztahu'],
      ['partnerska-shoda/scorpio-cancer.html', 'Štír a Rak ve vztahu'],
      ['partnerska-shoda/leo-scorpio.html', 'Lev a Štír ve vztahu'],
      ['partnerska-shoda/aries-virgo.html', 'Beran a Panna ve vztahu'],
      ['partnerska-shoda/cancer-aquarius.html', 'Rak a Vodnář ve vztahu'],
      ['partnerska-shoda/scorpio-pisces.html', 'Štír a Ryby ve vztahu'],
      ['partnerska-shoda/gemini-sagittarius.html', 'Blíženci a Střelec ve vztahu'],
      ['partnerska-shoda/leo-scorpio.html?source=synastry_scorpio_cluster&amp;feature=compatibility&amp;intent=leo_scorpio', 'Lev a Štír / Skorpion'],
      ['partnerska-shoda/taurus-scorpio.html?source=synastry_scorpio_cluster&amp;feature=compatibility&amp;intent=taurus_scorpio', 'Býk a Štír'],
      ['partnerska-shoda/aries-scorpio.html?source=synastry_scorpio_cluster&amp;feature=compatibility&amp;intent=aries_scorpio', 'Beran a Štír'],
      ['tarot-ano-ne.html?source=synastry_intent_cluster&amp;feature=tarot_yes_no&amp;intent=relationship_yes_no', 'Zeptat se jednou kartou']
    ].forEach(([href, anchor]) => {
      expect(html).toContain(href);
      expect(html).toContain(anchor);
    });

    expect(html).toContain('id="synastry-scorpio-cluster"');
    expect(html).toContain('Štír se v dotazech často píše i jako Skorpion');
    expect(html).toContain('partnerska-shoda/aries-taurus.html');
    expect(html).toContain('partnerska-shoda/leo-scorpio.html');
    expect(html).not.toContain('href="kompatibilita/');
  });

  it('keeps legacy Czech compatibility cluster deindexed in favor of partnerska-shoda pages', async () => {
    const legacyHtml = await readPage('kompatibilita/lev-stir.html');
    const sitemap = await readPage('sitemap.xml');

    expect(legacyHtml).toContain('<meta name="robots" content="noindex, follow">');
    expect(legacyHtml).toContain('<link rel="canonical" href="https://www.mystickahvezda.cz/partnerska-shoda/leo-scorpio.html">');
    expect(sitemap).not.toContain('https://www.mystickahvezda.cz/kompatibilita/lev-stir.html');
    expect(sitemap).toContain('https://www.mystickahvezda.cz/partnerska-shoda/leo-scorpio.html');
  });

  it('links supporting angel-card topics from the angel card hub', async () => {
    const html = await readPage('andelske-karty.html');

    expect(html).toContain('id="angel-topic-links"');
    expect(html).toContain('Navazující témata');
    expect(html).toContain('blog/andelska-cisla-1111.html?source=angel_topic_links&amp;feature=angel_numbers&amp;intent=1111');
    expect(html).toContain('Andělské číslo 1111: význam a poselství');
    expect(html).toContain('blog/jak-funguji-andelske-karty.html?source=angel_topic_links');
    expect(html).toContain('Jak fungují andělské karty');
    expect(html).toContain('blog/pruvodce-energie-ochrana.html?source=angel_topic_links');
    expect(html).toContain('kristalova-koule.html?source=angel_topic_links&amp;feature=kristalova_koule&amp;intent=yes_no_question');
  });

  it.each([
    ['partnerska-shoda/sagittarius-pisces.html', 'Střelec a Ryby', 'sagittarius-pisces'],
    ['partnerska-shoda/aquarius-taurus.html', 'Vodnář a Býk', 'aquarius-taurus'],
    ['partnerska-shoda/capricorn-leo.html', 'Kozoroh a Lev', 'capricorn-leo'],
    ['partnerska-shoda/virgo-leo.html', 'Panna a Lev', 'virgo-leo'],
    ['partnerska-shoda/leo-scorpio.html', 'Lev a Štír', 'leo-scorpio'],
    ['partnerska-shoda/aries-virgo.html', 'Beran a Panna', 'aries-virgo'],
    ['partnerska-shoda/cancer-aquarius.html', 'Rak a Vodnář', 'cancer-aquarius'],
    ['partnerska-shoda/scorpio-pisces.html', 'Štír a Ryby', 'scorpio-pisces'],
    ['partnerska-shoda/gemini-sagittarius.html', 'Blíženci a Střelec', 'gemini-sagittarius'],
    ['partnerska-shoda/taurus-scorpio.html', 'Býk a Štír', 'taurus-scorpio'],
    ['partnerska-shoda/aries-scorpio.html', 'Beran a Štír', 'aries-scorpio'],
    ['partnerska-shoda/scorpio-capricorn.html', 'Štír a Kozoroh', 'scorpio-capricorn']
  ])('updates partner pair metadata and measured CTA for %s', async (relativePath, pair, slug) => {
    const html = await readPage(relativePath);

    expectCoreMetadata(html);
    expect(html).toContain(`${pair}: láska, vztah a kompatibilita | Mystická Hvězda`);
    expect(html).toContain(`${pair} ve vztahu: láska, komunikace`);
    expect(html).toContain(`../partnerska-shoda.html?source=seo_partner_pair&feature=compatibility&pair=${slug}#form`);
    expect(html).toContain('application/ld+json');
  });

  it.each([
    ['partnerska-shoda/leo-scorpio.html', 'Lev a Skorpion'],
    ['partnerska-shoda/taurus-scorpio.html', 'Býk a Skorpion'],
    ['partnerska-shoda/scorpio-cancer.html', 'Skorpion a Rak'],
    ['partnerska-shoda/scorpio-capricorn.html', 'Skorpion a Kozoroh']
  ])('keeps Skorpion query variant on %s', async (relativePath, alias) => {
    const html = await readPage(relativePath);

    expectCoreMetadata(html);
    expect(html).toContain('Štír bývá hledaný i jako Skorpion');
    expect(html).toContain(`<strong>Hledané také:</strong> ${alias}`);
    expect(html).toContain('class="compatibility-search-note"');
  });

  it('expands tarot card detail snippets with Czech love work and yes-no intent', async () => {
    const html = await readPage('tarot-vyznam/kralovna-poharu.html');

    expectCoreMetadata(html);
    expect(html).toContain('Královna pohárů tarot: význam, láska a ano/ne');
    expect(html).toContain('Královna pohárů jako odpověď ano/ne');
    expect(html).toContain('Královna pohárů v tarotu znamená empatii, intuici a citovou hloubku');
    expect(html).toContain('/tarot.html?source=tarot_card_detail_next_step');
  });

  it.each([
    ['sk/kristalova-koule.html', 'Krištáľová guľa áno alebo nie'],
    ['pl/kristalova-koule.html', 'Kryształowa kula tak czy nie']
  ])('keeps localized crystal ball yes-no intent and hreflang for %s', async (relativePath, intent) => {
    const html = await readPage(relativePath);

    expectCoreMetadata(html);
    expect(html).toContain(intent);
    expect(html).toMatch(/<link\s+rel="alternate"\s+hreflang="cs"/i);
    expect(html).toMatch(/<link\s+rel="alternate"\s+hreflang="sk"/i);
    expect(html).toMatch(/<link\s+rel="alternate"\s+hreflang="pl"/i);
  });
});
