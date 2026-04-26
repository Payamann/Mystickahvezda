(function () {
    'use strict';

    // 12 měsíčních totemů – inspirováno tradicí Sun Beara (Earth Astrology)
    const TOTEMS = [
        {
            name: 'Sokol',
            native: 'Wambli (Lakota)',
            animal: '🦅',
            direction: 'Východ',
            element: 'Oheň',
            season: 'Jaro',
            from: { month: 3, day: 21 },
            to:   { month: 4, day: 19 }
        },
        {
            name: 'Bobr',
            native: 'Čápa (Algonquin)',
            animal: '🦫',
            direction: 'Východ',
            element: 'Země',
            season: 'Jaro',
            from: { month: 4, day: 20 },
            to:   { month: 5, day: 20 }
        },
        {
            name: 'Jelen',
            native: 'Tahca (Lakota)',
            animal: '🦌',
            direction: 'Jih',
            element: 'Vzduch',
            season: 'Léto',
            from: { month: 5, day: 21 },
            to:   { month: 6, day: 20 }
        },
        {
            name: 'Datlovník',
            native: 'Pekpek (Ojibwe)',
            animal: '🐦',
            direction: 'Jih',
            element: 'Voda',
            season: 'Léto',
            from: { month: 6, day: 21 },
            to:   { month: 7, day: 21 }
        },
        {
            name: 'Losos',
            native: 'Namewini (Ojibwe)',
            animal: '🐟',
            direction: 'Jih',
            element: 'Oheň',
            season: 'Léto',
            from: { month: 7, day: 22 },
            to:   { month: 8, day: 21 }
        },
        {
            name: 'Medvěd',
            native: 'Mato (Lakota)',
            animal: '🐻',
            direction: 'Západ',
            element: 'Země',
            season: 'Podzim',
            from: { month: 8, day: 22 },
            to:   { month: 9, day: 21 }
        },
        {
            name: 'Vrána',
            native: 'Kangí (Lakota)',
            animal: '🐦‍⬛',
            direction: 'Západ',
            element: 'Vzduch',
            season: 'Podzim',
            from: { month: 9, day: 22 },
            to:   { month: 10, day: 22 }
        },
        {
            name: 'Had',
            native: 'Zuzeca (Lakota)',
            animal: '🐍',
            direction: 'Západ',
            element: 'Voda',
            season: 'Podzim',
            from: { month: 10, day: 23 },
            to:   { month: 11, day: 22 }
        },
        {
            name: 'Sova',
            native: 'Hinhan (Lakota)',
            animal: '🦉',
            direction: 'Sever',
            element: 'Oheň',
            season: 'Zima',
            from: { month: 11, day: 23 },
            to:   { month: 12, day: 21 }
        },
        {
            name: 'Sněžná Husa',
            native: 'Wabizii (Ojibwe)',
            animal: '🪿',
            direction: 'Sever',
            element: 'Vzduch',
            season: 'Zima',
            from: { month: 12, day: 22 },
            to:   { month: 1, day: 19 }
        },
        {
            name: 'Vydra',
            native: 'Nigig (Ojibwe)',
            animal: '🦦',
            direction: 'Sever',
            element: 'Voda',
            season: 'Zima',
            from: { month: 1, day: 20 },
            to:   { month: 2, day: 18 }
        },
        {
            name: 'Vlk',
            native: 'Sungmanitu (Lakota)',
            animal: '🐺',
            direction: 'Východ',
            element: 'Vzduch',
            season: 'Zima → Jaro',
            from: { month: 2, day: 19 },
            to:   { month: 3, day: 20 }
        }
    ];

    const DIRECTION_SEGMENT_IDS = {
        'Východ': 'seg-east',
        'Jih':    'seg-south',
        'Západ':  'seg-west',
        'Sever':  'seg-north'
    };

    const DIRECTION_LABEL_IDS = {
        'Východ': 'lbl-east',
        'Jih':    'lbl-south',
        'Západ':  'lbl-west',
        'Sever':  'lbl-north'
    };

    function apiBase() {
        return (window.API_CONFIG && window.API_CONFIG.BASE_URL) || '/api';
    }

    function setBlockVisible(id, visible) {
        const el = document.getElementById(id);
        if (!el) return;
        el.hidden = !visible;
        el.classList.toggle('mh-block-visible', visible);
    }

    function setInlineFlexVisible(id, visible) {
        const el = document.getElementById(id);
        if (!el) return;
        el.hidden = !visible;
        el.classList.toggle('mh-flex-visible', visible);
    }

    function showError(msg) {
        const el = document.getElementById('mw-error');
        el.textContent = msg;
        setBlockVisible('mw-error', true);
    }

    function hideError() {
        setBlockVisible('mw-error', false);
    }

    function getTotemByDate(dateStr) {
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();

        for (const totem of TOTEMS) {
            const { from, to } = totem;
            // Handle year wrap (Sněžná Husa: 22.12 – 19.1)
            if (from.month > to.month) {
                if (month === from.month && day >= from.day) return totem;
                if (month === to.month   && day <= to.day)   return totem;
            } else {
                if (
                    (month === from.month && day >= from.day) ||
                    (month === to.month   && day <= to.day)   ||
                    (month > from.month   && month < to.month)
                ) return totem;
            }
        }
        // Fallback: Vlk
        return TOTEMS[11];
    }

    function highlightWheel(direction) {
        const dirs = ['east', 'south', 'west', 'north'];
        const dirMap = { 'Východ': 'east', 'Jih': 'south', 'Západ': 'west', 'Sever': 'north' };
        const activeDir = dirMap[direction] || '';

        dirs.forEach(d => {
            const seg  = document.getElementById('seg-' + d);
            const glow = document.getElementById('seg-' + d + '-glow');
            if (seg)  seg.classList.toggle('active',  d === activeDir);
            if (glow) glow.classList.toggle('active', d === activeDir);
        });

        Object.values(DIRECTION_LABEL_IDS).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const lblId = DIRECTION_LABEL_IDS[direction];
        if (lblId) {
            const lbl = document.getElementById(lblId);
            if (lbl) lbl.classList.add('active');
        }
    }

    const DIRECTION_ICONS = {
        'Východ': '🌅',
        'Jih':    '☀️',
        'Západ':  '🌄',
        'Sever':  '❄️'
    };
    const ELEMENT_ICONS = {
        'Oheň':   '🔥',
        'Země':   '🌍',
        'Vzduch': '💨',
        'Voda':   '💧'
    };
    const DIRECTION_CARD_CLASSES = {
        'Východ': 'mw-card--east',
        'Jih':    'mw-card--south',
        'Západ':  'mw-card--west',
        'Sever':  'mw-card--north'
    };

    function showFreeResult(name, totem) {
        // Center emoji
        const centerEmoji = document.getElementById('mw-center-emoji');
        if (centerEmoji) centerEmoji.textContent = totem.animal;

        // Highlight wheel
        highlightWheel(totem.direction);

        // Direction color class on cards
        const dirCard = document.getElementById('mw-direction-card');
        if (dirCard) {
            Object.values(DIRECTION_CARD_CLASSES).forEach(c => dirCard.classList.remove(c));
            dirCard.classList.add(DIRECTION_CARD_CLASSES[totem.direction] || '');
        }

        // Direction & element icons
        const dirIcon = document.getElementById('mw-direction-icon');
        if (dirIcon) dirIcon.textContent = DIRECTION_ICONS[totem.direction] || '🧭';

        const elIcon = document.getElementById('mw-element-icon');
        if (elIcon) elIcon.textContent = ELEMENT_ICONS[totem.element] || '🌊';

        // data-direction for CSS theming
        document.getElementById('mw-result').dataset.direction = totem.direction;

        // Totem banner
        document.getElementById('res-animal').textContent = totem.animal;
        document.getElementById('res-totem').textContent = totem.name;
        document.getElementById('res-native').textContent = totem.native;

        // Free cards
        document.getElementById('res-direction').textContent =
            totem.direction + ' — strana ' + directionMeaning(totem.direction);
        document.getElementById('res-element').textContent =
            totem.element + ' · ' + totem.season;
    }

    function directionMeaning(direction) {
        const meanings = {
            'Východ':  'úsvitu a nových začátků',
            'Jih':     'tepla, růstu a srdce',
            'Západ':   'introspekce a proměny',
            'Sever':   'moudrosti a vnitřní síly'
        };
        return meanings[direction] || direction;
    }

    function setupShare(name, totem) {
        const pageUrl = 'https://www.mystickahvezda.cz/shamansko-kolo.html';
        const firstName = name.split(' ')[0];
        const shareText = '🧭 ' + firstName + ' zjistil/a své místo na Šamanském Kole! ' +
            'Totem: ' + totem.animal + ' ' + totem.name +
            ' · ' + totem.direction + ' · ' + totem.element +
            ' · Zjisti i svůj totem ↓';

        const fbBtn = document.getElementById('share-fb');
        fbBtn.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl) +
            '&quote=' + encodeURIComponent(shareText);

        const xBtn = document.getElementById('share-x');
        xBtn.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText + '\n' + pageUrl);

        const copyBtn  = document.getElementById('share-copy');
        const copyLabel = document.getElementById('copy-label');
        copyBtn.onclick = function () {
            const toCopy = shareText + '\n' + pageUrl;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(toCopy)
                    .then(function () { showCopied(copyBtn, copyLabel); })
                    .catch(function () { fallbackCopy(toCopy, copyBtn, copyLabel); });
            } else {
                fallbackCopy(toCopy, copyBtn, copyLabel);
            }
        };

        const nativeBtn = document.getElementById('share-native');
        if (navigator.share) {
            setInlineFlexVisible('share-native', true);
            nativeBtn.onclick = function () {
                navigator.share({
                    title: 'Mé Šamanské Kolo — ' + totem.name,
                    text: shareText,
                    url: pageUrl
                }).catch(function () {});
            };
        } else {
            setInlineFlexVisible('share-native', false);
        }
    }

    function showCopied(btn, label) {
        btn.classList.add('copied');
        label.textContent = 'Zkopírováno!';
        setTimeout(function () {
            btn.classList.remove('copied');
            label.textContent = 'Kopírovat odkaz';
        }, 2200);
    }

    function fallbackCopy(text, btn, label) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.className = 'clipboard-hidden-textarea';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopied(btn, label); } catch (e) {}
        document.body.removeChild(ta);
    }

    function startMedicineWheelUpgradeFlow() {
        window.MH_ANALYTICS?.trackCTA?.('medicine_wheel_premium_wall', {
            plan_id: 'pruvodce',
            feature: 'shamanske_kolo_plne_cteni'
        });

        window.Auth?.startPlanCheckout?.('pruvodce', {
            source: 'medicine_wheel_premium_wall',
            feature: 'shamanske_kolo_plne_cteni',
            redirect: '/cenik.html',
            authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
        });
    }

    function showPremiumContent(data) {
        document.getElementById('res-strengths').textContent = data.strengths || '';
        document.getElementById('res-challenges').textContent = data.challenges || '';
        document.getElementById('res-message').textContent = data.message || '';
        setBlockVisible('mw-premium-content', true);
        setBlockVisible('mw-premium-wall', false);
    }

    function showPremiumWall() {
        setBlockVisible('mw-premium-content', false);
        setBlockVisible('mw-premium-wall', true);
        document
            .querySelector('#mw-premium-wall a[href="cenik.html"]')
            ?.addEventListener('click', (event) => {
                event.preventDefault();
                startMedicineWheelUpgradeFlow();
            }, { once: true });
    }

    function init() {
        document.getElementById('mw-submit').addEventListener('click', async function () {
            hideError();

            const name  = document.getElementById('mw-name').value.trim();
            const birth = document.getElementById('mw-birth').value;

            if (!name || name.length < 2) { showError('Zadejte své jméno (alespoň 2 znaky).'); return; }
            if (!birth) { showError('Zadejte datum narození.'); return; }

            // Show loading
            setBlockVisible('mw-form-section', false);
            setBlockVisible('mw-loading', true);
            document.getElementById('mw-result').classList.remove('visible');

            // Determine totem locally (always available)
            const totem = getTotemByDate(birth);

            try {
                // Get CSRF token
                const csrfRes  = await fetch(apiBase() + '/csrf-token', { credentials: 'include' });
                const csrfData = await csrfRes.json();

                const res = await fetch(apiBase() + '/medicine-wheel', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfData.csrfToken || ''
                    },
                    body: JSON.stringify({ name, birthDate: birth, totem: totem.name })
                });

                const data = await res.json();

                setBlockVisible('mw-loading', false);

                // Show free result regardless of API outcome
                showFreeResult(name, totem);

                if (res.ok && data.success && data.result && data.result.strengths) {
                    showPremiumContent(data.result);
                } else {
                    showPremiumWall();
                }

            } catch (e) {
                setBlockVisible('mw-loading', false);
                // Network error – show free (local) result, premium wall
                showFreeResult(name, totem);
                showPremiumWall();
            }

            setupShare(name, totem);
            document.getElementById('mw-result').classList.add('visible');
            window.scrollTo({ top: document.getElementById('mw-result').offsetTop - 80, behavior: 'smooth' });
        });

        // Reset
        document.getElementById('mw-reset').addEventListener('click', function () {
            document.getElementById('mw-result').classList.remove('visible');
            setBlockVisible('mw-form-section', true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
