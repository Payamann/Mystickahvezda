import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DICTIONARY_TERMS from '../data/dictionary-terms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

const TEMPLATE_PATH = path.join(ROOT, 'templates/dictionary-term.html');
const OUTPUT_DIR = path.join(ROOT, 'slovnik');
const INDEX_PATH = path.join(ROOT, 'data/dictionary-index.json');
const SITEMAP_ENTRIES_PATH = path.join(ROOT, 'data/dictionary-sitemap.json');

function categoryToFeature(category) {
    const map = {
        'Astrologie': { icon: '⭐', link: '../natalni-karta.html', label: 'Natální Karta' },
        'Tarot': { icon: '🃏', link: '../tarot.html', label: 'Tarot výklad' },
        'Numerologie': { icon: '🔢', link: '../numerologie.html', label: 'Numerologie' },
        'Runosloví': { icon: 'ᚱ', link: '../runy.html', label: 'Výklad Run' },
        'Energie': { icon: '⚡', link: '../mentor.html', label: 'Průvodce' },
        'Spiritualita': { icon: '🌌', link: '../horoskopy.html', label: 'Horoskopy' },
        'Snář': { icon: '🌙', link: '../snar.html', label: 'Snář' },
    };
    return map[category] || { icon: '✨', link: '../index.html', label: 'Mystická Hvězda' };
}

function buildRelatedTermsHtml(term, allTerms) {
    if (!term.related_slugs || term.related_slugs.length === 0) return '';
    const related = term.related_slugs
        .map(slug => allTerms.find(t => t.slug === slug))
        .filter(Boolean);
    if (related.length === 0) return '';
    const items = related.map(r => `
        <a href="${r.slug}.html" style="display:inline-block; margin: 0.3rem; padding: 0.5rem 1rem; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 50px; color: #d4af37; text-decoration: none; font-size: 0.9rem; transition: all 0.2s ease;">
            ${r.title}
        </a>`).join('');
    return `<div style="margin-top:3rem; padding-top:2rem; border-top: 1px solid rgba(255,255,255,0.08);">
        <p style="font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; color:var(--color-text-mutated); margin-bottom:1rem;">📚 Související pojmy</p>
        <div>${items}</div>
    </div>`;
}

function buildRelatedBlogHtml(term) {
    if (!term.linked_blog_slug) return '';
    return `<div style="margin-top:2rem; padding: 1.5rem; background: rgba(155,89,182,0.08); border-left: 3px solid var(--color-primary); border-radius:0 12px 12px 0;">
        <p style="margin:0; font-size:0.9rem; color:var(--color-text-mutated);">📖 <strong style="color:white;">Čtěte v blogu:</strong> <a href="../blog/${term.linked_blog_slug}.html" style="color:var(--color-primary); text-decoration:underline;">Přejít na článek →</a></p>
    </div>`;
}

function generate() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const sitemapEntries = [];
    const index = [];

    for (const term of DICTIONARY_TERMS) {
        const feature = categoryToFeature(term.category);
        const relatedTermsHtml = buildRelatedTermsHtml(term, DICTIONARY_TERMS);
        const relatedBlogHtml = buildRelatedBlogHtml(term);

        const relatedFeaturesHtml = `
            <a href="${feature.link}" class="feature-card">
                <div class="feature-icon">${feature.icon}</div>
                <div class="feature-title">${feature.label}</div>
            </a>
            <a href="../blog.html" class="feature-card">
                <div class="feature-icon">📝</div>
                <div class="feature-title">Blog</div>
            </a>
            <a href="../slovnik.html" class="feature-card">
                <div class="feature-icon">📖</div>
                <div class="feature-title">Celý Slovník</div>
            </a>`;

        const fullContentHtml = term.content_html + relatedBlogHtml + relatedTermsHtml;

        const schema = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            "name": term.title,
            "description": term.short_description,
            "inDefinedTermSet": {
                "@type": "DefinedTermSet",
                "name": "Ezoterický Slovník – Mystická Hvězda",
                "url": "https://www.mystickahvezda.cz/slovnik.html"
            }
        }, null, 2);

        let html = template
            .replace(/\{\{TITLE\}\}/g, term.title)
            .replace(/\{\{DESCRIPTION\}\}/g, term.short_description)
            .replace(/\{\{CATEGORY\}\}/g, term.category)
            .replace(/\{\{CONTENT_HTML\}\}/g, fullContentHtml)
            .replace(/\{\{RELATED_FEATURES_HTML\}\}/g, relatedFeaturesHtml)
            .replace(/\{\{SCHEMA_JSON\}\}/g, schema);

        const outPath = path.join(OUTPUT_DIR, `${term.slug}.html`);
        fs.writeFileSync(outPath, html, 'utf8');
        console.log(`✅ Vygenerováno: /slovnik/${term.slug}.html`);

        sitemapEntries.push({ url: `/slovnik/${term.slug}.html`, changefreq: 'monthly', priority: '0.6' });
        index.push({
            slug: term.slug,
            title: term.title,
            category: term.category,
            short_description: term.short_description
        });
    }

    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
    fs.writeFileSync(SITEMAP_ENTRIES_PATH, JSON.stringify(sitemapEntries, null, 2), 'utf8');
    console.log(`\n📂 Slovníkový index uložen: data/dictionary-index.json`);
    console.log(`🗺️  Sitemap data uložena: data/dictionary-sitemap.json`);
    console.log(`\n🎉 Slovník úspěšně vygenerován! (${DICTIONARY_TERMS.length} pojmů)`);
}

generate();
