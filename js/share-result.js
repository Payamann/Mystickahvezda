/**
 * share-result.js — Web Share API helper pro sdílení výsledků
 * Automaticky přidá share button když najde výsledek na stránce
 */

(function () {
    'use strict';

    const SHARE_BTN_HTML = `
        <button class="share-result-btn" aria-label="Sdílet výsledek" style="
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.65rem 1.4rem;
            background: transparent;
            border: 1px solid rgba(212,175,55,0.5);
            border-radius: 50px;
            color: var(--color-mystic-gold, #d4af37);
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 1rem;
        " onmouseover="this.style.background='rgba(212,175,55,0.1)'" onmouseout="this.style.background='transparent'">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Sdílet výsledek
        </button>
        <div class="share-toast" style="
            display: none; position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
            background: rgba(20,15,40,0.95); border: 1px solid rgba(212,175,55,0.4);
            padding: 0.75rem 1.5rem; border-radius: 50px; color: white;
            font-size: 0.9rem; z-index: 9999; backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        ">✅ Odkaz zkopírován do schránky!</div>
    `;

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
            const shareUrl = window.location.href;
            const shareTitle = title || document.title;

            if (navigator.share) {
                try {
                    await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                    return;
                } catch (e) { /* fallback */ }
            }

            // Fallback: clipboard
            try {
                await navigator.clipboard.writeText(`${shareTitle}\n\n${shareUrl}`);
                showToast(toast);
            } catch (e) {
                prompt('Zkopírujte odkaz:', shareUrl);
            }
        });
    }

    function showToast(toast) {
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Observer — čeká na zobrazení výsledků a přidá share button
    const selectors = [
        // obecné třídy
        '.reading-result', '.ai-result', '.result-section',
        '.crystal-result', '.natal-result', '.numerology-result',
        '.synastry-result', '.mentor-result', '#ai-reading', '.oracle-response',
        // konkrétní ID na jednotlivých stránkách
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

    // Selectors that require explicit data-loaded flag before showing share button
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
        // Okamžitá kontrola — pro elementy s obsahem hned při loadu
        checkAll();

        const observer = new MutationObserver(checkAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', observeResults);
})();
