/**
 * blog-enhancements.js
 * Přidává: Reading time, Scroll progress bar, Table of Contents, Sticky CTA
 * Načte se automaticky na všech blog postech
 */
(function () {
    'use strict';

    // ─── 1. SCROLL PROGRESS BAR ─────────────────────────────────────────────
    function initScrollProgress() {
        const bar = document.createElement('div');
        bar.id = 'scroll-progress-bar';
        bar.style.cssText = `
            position: fixed; top: 0; left: 0; height: 3px; width: 0%;
            background: linear-gradient(90deg, #9b59b6, #d4af37, #9b59b6);
            background-size: 200% 100%;
            z-index: 9999; transition: width 0.1s linear;
            animation: shimmer 3s linear infinite;
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>
            @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        </style>`);
        document.body.prepend(bar);

        const content = document.querySelector('.blog-content, article, main');
        if (!content) return;

        window.addEventListener('scroll', () => {
            const contentTop = content.offsetTop;
            const contentHeight = content.offsetHeight;
            const scrolled = window.scrollY - contentTop;
            const pct = Math.min(100, Math.max(0, (scrolled / contentHeight) * 100));
            bar.style.width = pct + '%';
        }, { passive: true });
    }

    // ─── 2. READING TIME ────────────────────────────────────────────────────
    function initReadingTime() {
        const content = document.querySelector('.blog-content, article');
        if (!content) return;

        const text = content.innerText || '';
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.max(1, Math.ceil(words / 200));

        // Najdi h1 nebo první nadpis
        const h1 = document.querySelector('h1, .blog-header__title, .post-title');
        if (!h1) return;

        const badge = document.createElement('div');
        badge.style.cssText = `
            display: inline-flex; align-items: center; gap: 0.5rem;
            color: rgba(255,255,255,0.5); font-size: 0.85rem;
            margin-top: 0.75rem; margin-bottom: 1.5rem;
        `;
        badge.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${minutes} min čtení &nbsp;•&nbsp;
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            ${words.toLocaleString('cs-CZ')} slov
        `;
        h1.insertAdjacentElement('afterend', badge);
    }

    // ─── 3. TABLE OF CONTENTS ───────────────────────────────────────────────
    function initToC() {
        const content = document.querySelector('.blog-content');
        if (!content) return;

        const headings = [...content.querySelectorAll('h2, h3')];
        if (headings.length < 3) return; // ToC jen pro delší posty

        // Přidej ID na každý heading
        headings.forEach((h, i) => {
            if (!h.id) h.id = 'section-' + i;
        });

        const toc = document.createElement('div');
        toc.id = 'table-of-contents';
        toc.style.cssText = `
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(212,175,55,0.2);
            border-left: 3px solid #d4af37;
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
            margin: 2rem 0;
        `;

        const items = headings.map(h => {
            const isH3 = h.tagName === 'H3';
            return `<li style="margin: 0.4rem 0 0.4rem ${isH3 ? '1.5rem' : '0'}; list-style: ${isH3 ? 'circle' : 'disc'};">
                <a href="#${h.id}" style="color: ${isH3 ? 'rgba(255,255,255,0.6)' : '#d4af37'}; text-decoration: none; font-size: ${isH3 ? '0.88rem' : '0.95rem'}; transition: color 0.2s;"
                   onmouseover="this.style.color='#f5d17f'" onmouseout="this.style.color='${isH3 ? 'rgba(255,255,255,0.6)' : '#d4af37'}'">
                    ${h.textContent.trim()}
                </a>
            </li>`;
        }).join('');

        toc.innerHTML = `
            <p style="font-family:'Cinzel',serif; color:#d4af37; font-size:0.9rem; font-weight:600; margin:0 0 0.75rem; display:flex; align-items:center; gap:0.5rem;">
                📋 Obsah článku
            </p>
            <ul style="margin:0; padding:0 0 0 1.25rem; color:rgba(255,255,255,0.7);">
                ${items}
            </ul>
        `;

        // Vlož ToC za první odstavec nebo za h1
        const firstP = content.querySelector('p');
        if (firstP && firstP.nextSibling) {
            firstP.insertAdjacentElement('afterend', toc);
        } else {
            content.prepend(toc);
        }
    }

    // ─── 4. STICKY MINI-CTA ─────────────────────────────────────────────────
    function initStickyCTA() {
        // Nezobrazovat přihlášeným premium uživatelům
        if (typeof window.Auth !== 'undefined' && window.Auth.isPremium?.()) return;

        const cta = document.createElement('div');
        cta.id = 'sticky-blog-cta';
        cta.style.cssText = `
            position: fixed; bottom: 1.5rem; right: 1.5rem;
            background: linear-gradient(135deg, #1e1040, #2d1060);
            border: 1px solid rgba(212,175,55,0.4);
            border-radius: 50px;
            padding: 0.65rem 1.25rem;
            display: flex; align-items: center; gap: 0.6rem;
            z-index: 888;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            transform: translateY(100px); opacity: 0;
            transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s;
            cursor: pointer;
        `;
        cta.innerHTML = `
            <span style="font-size: 1.1rem;">✨</span>
            <a href="../cenik.html" style="color:#d4af37; font-size:0.85rem; font-weight:600; text-decoration:none; white-space:nowrap;">
                7 dní zdarma
            </a>
            <button onclick="document.getElementById('sticky-blog-cta').remove()" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:1rem;padding:0;margin-left:0.25rem;line-height:1;" aria-label="Zavřít">×</button>
        `;
        document.body.appendChild(cta);

        // Zobraz po 50% scrollu
        let shown = false;
        window.addEventListener('scroll', () => {
            const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if (!shown && pct > 50) {
                shown = true;
                cta.style.transform = 'translateY(0)';
                cta.style.opacity = '1';
            }
        }, { passive: true });
    }

    // ─── 5. BREADCRUMBS ─────────────────────────────────────────────────────
    function initBreadcrumbs() {
        const title = document.title.replace(' | Blog Mystická Hvězda', '').replace(' | Mystická Hvězda', '');
        const slug = window.location.pathname.split('/').pop().replace('.html', '');

        // Visual breadcrumb
        const bc = document.createElement('nav');
        bc.setAttribute('aria-label', 'Breadcrumb');
        bc.style.cssText = 'margin-bottom: 1.5rem; font-size: 0.85rem;';
        bc.innerHTML = `
            <ol style="list-style:none; padding:0; margin:0; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; color:rgba(255,255,255,0.45);">
                <li><a href="../index.html" style="color:rgba(255,255,255,0.45); text-decoration:none;" onmouseover="this.style.color='#d4af37'" onmouseout="this.style.color='rgba(255,255,255,0.45)'">Domů</a></li>
                <li>›</li>
                <li><a href="../blog.html" style="color:rgba(255,255,255,0.45); text-decoration:none;" onmouseover="this.style.color='#d4af37'" onmouseout="this.style.color='rgba(255,255,255,0.45)'">Blog</a></li>
                <li>›</li>
                <li style="color:rgba(255,255,255,0.7); max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${title}">${title}</li>
            </ol>
        `;

        const main = document.querySelector('main, #main-content, .blog-post');
        const header = document.querySelector('.blog-header, h1');
        if (header) {
            header.insertAdjacentElement('beforebegin', bc);
        } else if (main) {
            main.prepend(bc);
        }

        // BreadcrumbList schema
        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Domů", "item": "https://mystickahvezda.cz/" },
                { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://mystickahvezda.cz/blog.html" },
                { "@type": "ListItem", "position": 3, "name": title, "item": "https://mystickahvezda.cz/blog/" + slug + ".html" }
            ]
        };
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(schema);
        document.head.appendChild(s);
    }

    // ─── INIT ────────────────────────────────────────────────────────────────
    function init() {
        // Jen spustit na blog/ stránkách
        if (!window.location.pathname.includes('/blog/')) return;

        initScrollProgress();
        initReadingTime();
        initToC();
        initStickyCTA();
        initBreadcrumbs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
