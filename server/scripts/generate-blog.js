import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../db-supabase.js';
import DUMMY_DATA from '../data/blog-posts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../../templates/blog-post.html');
const OUTPUT_DIR = path.join(__dirname, '../../blog');

async function generateBlog() {
    console.log('📝 Zahajuji generování Blogu...');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Load template
    const templatePath = path.resolve(TEMPLATE_PATH);
    if (!fs.existsSync(templatePath)) {
        console.error(`❌ Šablona nebyla nalezena: ${templatePath}`);
        process.exit(1);
    }
    const template = fs.readFileSync(templatePath, 'utf8');

    let posts = [];
    try {
        const { data, error } = await supabase.from('blog_posts').select('*').eq('is_published', true);
        if (error) {
            console.warn('⚠️ Nastala chyba DB (blog), používám testovací data.', error.message);
            posts = DUMMY_DATA;
        } else if (!data || data.length === 0) {
            console.warn('⚠️ Supabase tabulka blog_posts je prázdná nebo chybí. Používám testovací data.');
            posts = DUMMY_DATA;
        } else {
            posts = data;
            console.log(`📡 Načteno ${posts.length} článků ze Supabase.`);
        }
    } catch (err) {
        console.warn('⚠️ Chyba sítě, používám testovací data pro blog.');
        posts = DUMMY_DATA;
    }

    const allPosts = [];

    for (const post of posts) {
        let html = template;

        const publishedDate = post.published_at ? new Date(post.published_at) : new Date();
        const formattedDate = publishedDate.toLocaleDateString('cs-CZ', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Hrubý výpočet doby čtení (200 slov za minutu)
        const wordCount = (post.content_html || '').replace(/<[^>]*>?/gm, '').split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        const featuredImageHtml = post.featured_image
            ? `<img src="${post.featured_image}" alt="${post.title}" class="blog-featured-image">`
            : '';

        // Generate JSON-LD schema
        const schema = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "image": post.featured_image || "https://www.mystickahvezda.cz/img/hero-3d.png",
            "author": {
                "@type": "Person",
                "name": post.author || "Mystická Hvězda"
            },
            "datePublished": publishedDate.toISOString(),
            "description": post.short_description || `Článek na téma ${post.title}`
        };

        // Replace placeholders
        html = html.replace(/{{TITLE}}/g, post.title || 'Nový článek');
        html = html.replace(/{{DESCRIPTION}}/g, post.short_description || `Článek o ${post.title}`);
        html = html.replace(/{{CATEGORY}}/g, post.category || 'Všeobecné');
        html = html.replace(/{{CONTENT_HTML}}/g, post.content_html || '<p>Obsah se připravuje.</p>');
        html = html.replace(/{{AUTHOR}}/g, post.author || 'Mystická Hvězda');
        html = html.replace(/{{PUBLISHED_AT}}/g, publishedDate.toISOString());
        html = html.replace(/{{PUBLISHED_DATE_FORMATTED}}/g, formattedDate);
        html = html.replace(/{{FEATURED_IMAGE}}/g, post.featured_image || '../img/hero-3d.png');
        html = html.replace(/{{FEATURED_IMAGE_HTML}}/g, featuredImageHtml);
        html = html.replace(/{{READ_TIME}}/g, readTime.toString());
        // Generate Related Posts (up to 3 other posts)
        const otherPosts = posts.filter(p => p.slug !== post.slug);
        // Shuffle and pick 3
        const shuffled = otherPosts.sort(() => 0.5 - Math.random());
        const related = shuffled.slice(0, 3);

        let relatedHtml = '';
        if (related.length === 0) {
            relatedHtml = '<p style="text-align:center; color: var(--color-text-mutated); grid-column:1/-1;">Zatím zde nejsou další články.</p>';
        } else {
            related.forEach(r => {
                const rDate = r.published_at ? new Date(r.published_at).toLocaleDateString('cs-CZ', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                const rImg = r.featured_image || '../img/hero-3d.png';
                // Simple word count for read time
                const rWordCount = (r.content_html || '').replace(/<[^>]*>?/gm, '').split(/\s+/).length;
                const rTime = Math.max(1, Math.ceil(rWordCount / 200));

                relatedHtml += `
                    <a href="${r.slug}.html" class="blog-card" style="box-shadow: 0 5px 15px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.05);">
                        <img src="${rImg}" alt="${r.title}" class="blog-card-image" style="height: 150px; border-bottom: 1px solid var(--color-primary);" loading="lazy">
                        <div class="blog-card-content" style="padding: 1.2rem;">
                            <div class="blog-meta" style="margin-bottom: 0.5rem; font-size: 0.75rem;">
                                <span>${r.category || 'Článek'}</span>
                            </div>
                            <div class="blog-title" style="font-size: 1.1rem; margin-bottom: 0.5rem;">${r.title}</div>
                            <div class="blog-footer" style="margin-top: auto; font-size: 0.8rem;">
                                <span>📅 ${rDate}</span>
                                <span>⏱ ${rTime} min.</span>
                            </div>
                        </div>
                    </a>`;
            });
        }

        html = html.replace(/{{RELATED_POSTS_HTML}}/g, relatedHtml);
        html = html.replace(/{{SCHEMA_JSON}}/g, JSON.stringify(schema, null, 4));

        const outPath = path.join(OUTPUT_DIR, `${post.slug}.html`);
        fs.writeFileSync(outPath, html, 'utf8');
        console.log(`✅ Vygenerováno: /blog/${post.slug}.html`);

        allPosts.push({
            title: post.title,
            slug: post.slug,
            short_description: post.short_description,
            category: post.category,
            published_at: publishedDate.toISOString(),
            featured_image: post.featured_image,
            readTime: readTime
        });
    }

    // Sort posts from newest to oldest for the index
    allPosts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    // Uložení malého JSON indexu pro blog
    const indexPath = path.join(__dirname, '../../data/blog-index.json');
    if (!fs.existsSync(path.dirname(indexPath))) {
        fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    }
    fs.writeFileSync(indexPath, JSON.stringify(allPosts, null, 2), 'utf8');
    console.log(`📂 Vytvořen index blogu: data/blog-index.json`);

    console.log('🎉 Generování blogu úspěšně dokončeno!');
    process.exit(0);
}

generateBlog();
