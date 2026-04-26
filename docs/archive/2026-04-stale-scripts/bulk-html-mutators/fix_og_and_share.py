"""
fix_og_and_share.py
-------------------
1. Opraví share-result.js — odstraní inline event handlery (CSP fix)
2. Hromadně doplní/opraví OG tagy ve všech blog postech:
   - og:url (kanonická URL)
   - og:site_name
   - og:locale
   - twitter:card
   - article:author (pokud chybí)
   - canonical link (pokud chybí)
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
BLOG_DIR = BASE_DIR / "blog"
JS_SHARE = BASE_DIR / "js" / "share-result.js"
JS_SHARE_DIST = BASE_DIR / "js" / "dist" / "share-result.js"
BASE_URL = "https://www.mystickahvezda.cz"

# ─────────────────────────────────────────────
# 1. Oprav share-result.js — odstraň inline handlers
# ─────────────────────────────────────────────

SHARE_JS_NEW = '''/**
 * share-result.js — Web Share API helper pro sdílení výsledků
 * Automaticky přidá share button když najde výsledek na stránce
 */

(function () {
    'use strict';

    const SHARE_BTN_HTML = `
        <button class="share-result-btn" aria-label="Sdílet výsledek">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Sdílet výsledek
        </button>
        <div class="share-toast" role="status" aria-live="polite">✅ Odkaz zkopírován do schránky!</div>
    `;

    const SHARE_BTN_STYLES = `
        .share-result-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.65rem 1.4rem;
            background: transparent;
            border: 1px solid rgba(212,175,55,0.5);
            border-radius: 50px;
            color: var(--color-mystic-gold, #d4af37);
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 1rem;
        }
        .share-result-btn:hover {
            background: rgba(212,175,55,0.1);
        }
        .share-toast {
            display: none;
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20,15,40,0.95);
            border: 1px solid rgba(212,175,55,0.4);
            padding: 0.75rem 1.5rem;
            border-radius: 50px;
            color: white;
            font-size: 0.9rem;
            z-index: 9999;
            backdrop-filter: blur(10px);
        }
        .share-toast.visible {
            display: block;
            animation: shareToastIn 0.3s ease;
        }
        @keyframes shareToastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;

    function injectStyles() {
        if (document.getElementById('share-result-styles')) return;
        const style = document.createElement('style');
        style.id = 'share-result-styles';
        style.textContent = SHARE_BTN_STYLES;
        document.head.appendChild(style);
    }

    function buildShareUrl(utmSource) {
        const url = new URL(window.location.href);
        url.searchParams.set('utm_source', utmSource);
        url.searchParams.set('utm_medium', 'share');
        url.searchParams.set('utm_campaign', 'result_share');
        return url.toString();
    }

    function addShareButton(container, title, text) {
        if (!container || container.querySelector('.share-result-btn')) return;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = SHARE_BTN_HTML;

        // Pro horoskop — vlož za odstavec s čísly štěstí, vycentruj
        const luckyNumbers = container.querySelector('#detail-numbers');
        if (luckyNumbers) {
            const luckyParagraph = luckyNumbers.closest('p') || luckyNumbers.parentElement;
            wrapper.style.textAlign = 'center';
            wrapper.style.marginTop = '1.5rem';
            wrapper.style.marginBottom = '2.5rem';
            luckyParagraph.insertAdjacentElement('afterend', wrapper);
        } else {
            container.appendChild(wrapper);
        }

        const btn = wrapper.querySelector('.share-result-btn');
        const toast = wrapper.querySelector('.share-toast');

        btn.addEventListener('click', async () => {
            const shareText = text || document.querySelector('.reading-text, .result-text, [data-share-text]')?.innerText?.slice(0, 200) || '';
            const shareTitle = title || document.title;

            // Detekce platformy pro UTM
            const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
            const utmSource = isMobile ? 'mobile_share' : 'web_share';
            const shareUrl = buildShareUrl(utmSource);

            if (navigator.share) {
                try {
                    await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                    return;
                } catch (e) { /* fallback */ }
            }

            // Fallback: clipboard
            try {
                await navigator.clipboard.writeText(`${shareTitle}\\n\\n${shareUrl}`);
                showToast(toast);
            } catch (e) {
                prompt('Zkopírujte odkaz:', shareUrl);
            }
        });
    }

    function showToast(toast) {
        toast.classList.add('visible');
        setTimeout(() => { toast.classList.remove('visible'); }, 3000);
    }

    // Observer — čeká na zobrazení výsledků a přidá share button
    const selectors = [
        '.reading-result', '.ai-result', '.result-section',
        '.crystal-result', '.natal-result', '.numerology-result',
        '.synastry-result', '.mentor-result', '#ai-reading', '.oracle-response',
        '#tarot-result', '#tarot-results',
        '#result-panel',
        '#horoscope-result', '#horoscope-detail-section',
        '#chart-results',
        '#numerology-results',
        '#phaseCard',
        '#astro-results',
        '#answer-container',
        '#biorhythm-results',
        '#aura-result',
        '#messages-container',
    ];

    const requireLoadedFlag = new Set(['#horoscope-detail-section']);

    function checkAll() {
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (!el || el.querySelector('.share-result-btn')) return;
            if (requireLoadedFlag.has(sel) && !el.dataset.loaded) return;
            if (el.children.length > 0) {
                const pageTitle = document.title.replace(' | Mystická Hvězda', '');
                addShareButton(el, `Můj výsledek: ${pageTitle} | Mystická Hvězda`);
            }
        });
    }

    function observeResults() {
        checkAll();
        const observer = new MutationObserver(checkAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        observeResults();
    });
})();
'''

print("📝 Opravuji share-result.js...")
for js_path in [JS_SHARE, JS_SHARE_DIST]:
    js_path.write_text(SHARE_JS_NEW, encoding='utf-8')
    print(f"  ✅ {js_path.relative_to(BASE_DIR)}")

# ─────────────────────────────────────────────
# 2. Hromadná oprava OG tagů v blog postech
# ─────────────────────────────────────────────

def extract_meta(html, prop_or_name):
    """Extrahuje content z meta tagu (property nebo name)."""
    patterns = [
        rf'<meta\s+property=["\']og:{prop_or_name}["\']\s+content=["\'](.*?)["\']',
        rf'<meta\s+content=["\'](.*?)["\']\s+property=["\']og:{prop_or_name}["\']',
    ]
    for p in patterns:
        m = re.search(p, html, re.IGNORECASE | re.DOTALL)
        if m:
            return m.group(1).strip()
    return None

def extract_title(html):
    m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None

def extract_description(html):
    m = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE | re.DOTALL)
    if not m:
        m = re.search(r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']', html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None

def has_tag(html, tag_snippet):
    return tag_snippet.lower() in html.lower()

def slug_to_canonical(slug):
    return f"{BASE_URL}/blog/{slug}"

def ensure_og_block(html, slug):
    """
    Přidá/doplní kompletní OG blok. Nemění stávající og:title ani og:description.
    Přidá chybějící: og:url, og:site_name, og:locale, twitter:card, canonical, article:author, pinterest-rich-pin.
    """
    canonical_url = slug_to_canonical(slug)
    title = extract_title(html) or "Mystická Hvězda"
    description = extract_description(html) or ""

    # Tagy které chceme mít — klíč = identifikátor pro test přítomnosti
    tags_to_ensure = []

    if not has_tag(html, 'property="og:url"') and not has_tag(html, "property='og:url'"):
        tags_to_ensure.append(f'    <meta property="og:url" content="{canonical_url}">')

    if not has_tag(html, 'property="og:site_name"') and not has_tag(html, "property='og:site_name'"):
        tags_to_ensure.append('    <meta property="og:site_name" content="Mystická Hvězda">')

    if not has_tag(html, 'property="og:locale"') and not has_tag(html, "property='og:locale'"):
        tags_to_ensure.append('    <meta property="og:locale" content="cs_CZ">')

    if not has_tag(html, 'property="og:type"') and not has_tag(html, "property='og:type'"):
        tags_to_ensure.append('    <meta property="og:type" content="article">')

    if not has_tag(html, 'property="og:title"') and not has_tag(html, "property='og:title'"):
        tags_to_ensure.append(f'    <meta property="og:title" content="{title}">')

    if not has_tag(html, 'property="og:description"') and not has_tag(html, "property='og:description'"):
        tags_to_ensure.append(f'    <meta property="og:description" content="{description}">')

    if not has_tag(html, 'property="og:image"') and not has_tag(html, "property='og:image'"):
        tags_to_ensure.append(f'    <meta property="og:image" content="{BASE_URL}/img/hero-3d.webp">')
        tags_to_ensure.append(f'    <meta property="og:image:width" content="1200">')
        tags_to_ensure.append(f'    <meta property="og:image:height" content="630">')
        tags_to_ensure.append(f'    <meta property="og:image:alt" content="{title}">')

    if not has_tag(html, 'property="article:author"') and not has_tag(html, "property='article:author'"):
        tags_to_ensure.append('    <meta property="article:author" content="Mystická Hvězda">')

    if not has_tag(html, 'name="twitter:card"') and not has_tag(html, "name='twitter:card'"):
        tags_to_ensure.append('    <meta name="twitter:card" content="summary_large_image">')

    if not has_tag(html, 'name="twitter:site"') and not has_tag(html, "name='twitter:site'"):
        tags_to_ensure.append('    <meta name="twitter:site" content="@mystickaHvezda">')

    if not has_tag(html, 'name="pinterest-rich-pin"') and not has_tag(html, "name='pinterest-rich-pin'"):
        tags_to_ensure.append('    <meta name="pinterest-rich-pin" content="true">')

    # Přidej canonical pokud chybí
    if not has_tag(html, 'rel="canonical"') and not has_tag(html, "rel='canonical'"):
        tags_to_ensure.append(f'    <link rel="canonical" href="{canonical_url}">')

    if not tags_to_ensure:
        return html, 0

    # Vlož před </head>
    new_tags = '\n    <!-- Doplněné OG / social tagy -->\n' + '\n'.join(tags_to_ensure) + '\n'
    html = html.replace('</head>', new_tags + '</head>', 1)
    return html, len(tags_to_ensure)

print("\n📝 Opravuji OG tagy v blog postech...")
total_changed = 0
total_tags = 0

for html_file in sorted(BLOG_DIR.glob("*.html")):
    original = html_file.read_text(encoding='utf-8')
    updated, n_tags = ensure_og_block(original, html_file.name)
    if updated != original:
        html_file.write_text(updated, encoding='utf-8')
        total_changed += 1
        total_tags += n_tags
        print(f"  ✅ {html_file.name} (+{n_tags} tagů)")
    else:
        print(f"  ✓  {html_file.name} (vše OK)")

print(f"\n✅ Hotovo! Upraveno {total_changed} souborů, přidáno ~{total_tags} tagů.")
print("📋 Nezapomeň také commitnout změny: git add -A && git commit")
