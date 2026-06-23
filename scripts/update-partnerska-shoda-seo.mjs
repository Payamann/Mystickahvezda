import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const pagesDir = path.join(repoRoot, 'partnerska-shoda');
const legacyPagesDir = path.join(repoRoot, 'kompatibilita');
const SITE_ORIGIN = 'https://www.mystickahvezda.cz';

const SIGNS = {
  aquarius: 'Vodnář',
  aries: 'Beran',
  cancer: 'Rak',
  capricorn: 'Kozoroh',
  gemini: 'Blíženci',
  leo: 'Lev',
  libra: 'Váhy',
  pisces: 'Ryby',
  sagittarius: 'Střelec',
  scorpio: 'Štír',
  taurus: 'Býk',
  virgo: 'Panna'
};

const CZECH_TO_ENGLISH_SLUGS = {
  beran: 'aries',
  byk: 'taurus',
  blizenci: 'gemini',
  rak: 'cancer',
  lev: 'leo',
  panna: 'virgo',
  vahy: 'libra',
  stir: 'scorpio',
  strelec: 'sagittarius',
  kozoroh: 'capricorn',
  vodnar: 'aquarius',
  ryby: 'pisces'
};

function replaceRequired(html, pattern, replacement, fileName, label) {
  if (!pattern.test(html)) {
    throw new Error(`Missing ${label} in ${fileName}`);
  }
  return html.replace(pattern, replacement);
}

function buildMetadata(slug) {
  const [firstSlug, secondSlug] = slug.split('-');
  const first = SIGNS[firstSlug];
  const second = SIGNS[secondSlug];
  const hasScorpio = firstSlug === 'scorpio' || secondSlug === 'scorpio';

  if (!first || !second) {
    throw new Error(`Unknown partner pair slug: ${slug}`);
  }

  const pair = `${first} a ${second}`;
  const title = `${pair}: láska, vztah a kompatibilita | Mystická Hvězda`;
  const description = hasScorpio
    ? `${pair} ve vztahu: láska, komunikace, chemie i výzvy. Štír bývá hledaný i jako Skorpion. Spočítejte přesnou shodu.`
    : `${pair} ve vztahu: láska, komunikace, silné stránky i výzvy. Spočítejte přesnou partnerskou shodu podle dat narození.`;
  const ctaHref = `../partnerska-shoda.html?source=seo_partner_pair&feature=compatibility&pair=${slug}#form`;
  const scorpioAlias = hasScorpio
    ? `${firstSlug === 'scorpio' ? 'Skorpion' : first} a ${secondSlug === 'scorpio' ? 'Skorpion' : second}`
    : null;

  return {
    ctaHref,
    description,
    first,
    pair,
    scorpioAlias,
    second,
    title
  };
}

function buildScorpioIntentNote(metadata) {
  if (!metadata.scorpioAlias) return '';

  return `<div class="compatibility-search-note">
                        <p><strong>Hledané také:</strong> ${metadata.scorpioAlias}. Štír se v českých dotazech často píše i jako Skorpion; jde o stejnou dvojici a stejný vztahový rozbor.</p>
                    </div>

                    `;
}

function updateScorpioIntentNote(html, metadata) {
  const withoutExistingNote = html.replace(
    /\s*<div class="compatibility-search-note">[\s\S]*?<\/div>\s*/u,
    '\n\n                    '
  );

  if (!metadata.scorpioAlias) return withoutExistingNote;

  return replaceRequired(
    withoutExistingNote,
    /(<div class="compatibility-content" data-animate>\s*)/u,
    `$1${buildScorpioIntentNote(metadata)}`,
    `${metadata.pair}.html`,
    'compatibility content'
  );
}

function convertLegacyCompatibilitySlug(czechSlug) {
  const parts = czechSlug.split('-');
  if (parts.length !== 2) return null;
  const englishParts = parts.map((part) => CZECH_TO_ENGLISH_SLUGS[part]);
  if (englishParts.some((part) => !part)) return null;
  return englishParts.join('-');
}

function legacyCanonicalForSlug(czechSlug) {
  const englishSlug = convertLegacyCompatibilitySlug(czechSlug);
  if (!englishSlug) return null;
  return `${SITE_ORIGIN}/partnerska-shoda/${englishSlug}.html`;
}

async function updateHubIndexLinks() {
  const hubPath = path.join(repoRoot, 'partnerska-shoda.html');
  let html = await fs.readFile(hubPath, 'utf8');

  html = html.replace(
    /href="kompatibilita\/([a-z-]+)\.html"/g,
    (match, czechSlug) => {
      const englishSlug = convertLegacyCompatibilitySlug(czechSlug);
      return englishSlug ? `href="partnerska-shoda/${englishSlug}.html"` : match;
    }
  );

  html = html.replace(
    /Pro přesnější vztahovou analýzu použij kalkulačku výše s daty narození obou lidí\./u,
    'Pro přesnější vztahovou analýzu použij kalkulačku výše s daty narození obou lidí. Odkazy níže vedou na novější párové rozbory v sekci Partnerská shoda.'
  );

  await fs.writeFile(hubPath, html, 'utf8');
}

async function updateLegacyCompatibilityPages() {
  const entries = await fs.readdir(legacyPagesDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name)
    .sort();

  let updated = 0;

  for (const fileName of htmlFiles) {
    const czechSlug = fileName.replace(/\.html$/u, '');
    const canonical = legacyCanonicalForSlug(czechSlug);
    if (!canonical) {
      throw new Error(`Unknown legacy compatibility slug: ${czechSlug}`);
    }

    const filePath = path.join(legacyPagesDir, fileName);
    let html = await fs.readFile(filePath, 'utf8');

    html = replaceRequired(
      html,
      /<meta\s+name="robots"\s+content="[^"]*"\s*>/is,
      '<meta name="robots" content="noindex, follow">',
      fileName,
      'legacy robots'
    );
    html = replaceRequired(
      html,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*>/is,
      `<link rel="canonical" href="${canonical}">`,
      fileName,
      'legacy canonical'
    );
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*>/is,
      `<meta property="og:url" content="${canonical}">`
    );

    await fs.writeFile(filePath, html, 'utf8');
    updated += 1;
  }

  return updated;
}

async function updatePartnerPages() {
  const entries = await fs.readdir(pagesDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
    .map((entry) => entry.name)
    .sort();

  let updated = 0;

  for (const fileName of htmlFiles) {
    const slug = fileName.replace(/\.html$/u, '');
    const metadata = buildMetadata(slug);
    const filePath = path.join(pagesDir, fileName);
    let html = await fs.readFile(filePath, 'utf8');

    html = replaceRequired(
      html,
      /<title>[\s\S]*?<\/title>/i,
      `<title>${metadata.title}</title>`,
      fileName,
      'title'
    );
    html = replaceRequired(
      html,
      /<meta\s+name="description"\s+content="[^"]*"\s*>/is,
      `<meta name="description"\n\n        content="${metadata.description}">`,
      fileName,
      'meta description'
    );
    html = replaceRequired(
      html,
      /<meta\s+property="og:title"\s+content="[^"]*"\s*>/i,
      `<meta property="og:title" content="${metadata.title}">`,
      fileName,
      'og:title'
    );
    html = replaceRequired(
      html,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*>/is,
      `<meta property="og:description"\n\n        content="${metadata.description}">`,
      fileName,
      'og:description'
    );
    html = replaceRequired(
      html,
      /<h1 class="hero__title">[\s\S]*?<\/h1>/i,
      `<h1 class="hero__title">${metadata.first} <span class="text-gradient">&</span> ${metadata.second}</h1>`,
      fileName,
      'hero h1'
    );
    html = html.replace(
      /href="\.\.\/partnerska-shoda\.html(?:\?[^"#]*)?#form"/g,
      `href="${metadata.ctaHref}"`
    );
    html = html.replace(/href="\.\.\/partnerska-shoda\.html#form"/g, `href="${metadata.ctaHref}"`);
    html = updateScorpioIntentNote(html, metadata);

    await fs.writeFile(filePath, html, 'utf8');
    updated += 1;
  }

  await updateHubIndexLinks();
  const legacyUpdated = await updateLegacyCompatibilityPages();
  console.log(`Updated ${updated} partner compatibility pages in ${path.relative(repoRoot, pagesDir)}`);
  console.log(`Marked ${legacyUpdated} legacy compatibility pages as noindex with canonical targets`);
}

updatePartnerPages().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
