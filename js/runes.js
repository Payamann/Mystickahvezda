/**
 * Runes Logic
 * Handles rune drawing, shuffling animation, and AI interpretations.
 */

const { apiUrl, authHeaders } = window;

let runesData = [];
let drawnRune = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load rune database
    try {
        const res = await fetch('data/runes.json');
        if (!res.ok) throw new Error('Nepodařilo se načíst databázi run.');
        runesData = await res.json();
    } catch (error) {
        console.error('Error loading runes:', error);
        alert('Došlo k chybě při načítání run. Zkuste prosím obnovit stránku.');
        return;
    }

    // 2. Initial setup
    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');
    const deepReadBtn = document.getElementById('btn-deep-reading');
    const saveBtn = document.getElementById('btn-save');
    const shareBtn = document.getElementById('btn-share');

    // 3. Check Daily Lock
    checkDailyLock();

    // 4. Attach listeners
    if (runeEl) {
        runeEl.addEventListener('click', drawRune);
    }
    if (drawBtn) {
        drawBtn.addEventListener('click', drawRune);
    }

    if (deepReadBtn) {
        deepReadBtn.addEventListener('click', requestDeepReading);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert('Tato funkce se právě připravuje. Brzy si budete moci ukládat výklady přímo do svého Hvězdného Deníku! ⭐');
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', shareRune);
    }
});

function shareRune() {
    if (!drawnRune) return;

    const shareTitle = `Moje runa dne: ${drawnRune.name} 🪨`;
    const shareText = `Dnes mě provází runa ${drawnRune.name} (${drawnRune.symbol}) - ${drawnRune.meaning}. Zjistěte, jaký kámen čeká na vás na Mystické Hvězdě! ✨`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch(console.warn);
    } else {
        navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n${shareUrl}`).then(() => {
            alert('Odkaz a poselství byly zkopírovány do schránky! Můžete je vložit přátelům.');
        }).catch(err => {
            console.error('Clipboard failed', err);
        });
    }
}

function checkDailyLock() {
    const today = new Date().toISOString().split('T')[0];
    const savedDataStr = localStorage.getItem('runeDaily');

    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            if (savedData.date === today && savedData.runeData) {
                drawnRune = savedData.runeData;
                revealPreDrawnRune();
            } else {
                localStorage.removeItem('runeDaily');
            }
        } catch (e) {
            console.error('Error parsing daily rune:', e);
            localStorage.removeItem('runeDaily');
        }
    }
}

function revealPreDrawnRune() {
    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');

    if (runeEl) {
        runeEl.classList.remove('hidden');
        document.getElementById('rune-symbol').textContent = drawnRune.symbol;
        runeEl.style.cursor = 'default';
        // Remove click listener manually by cloning if needed, or check drawnRune in click handler
    }

    if (drawBtn) {
        drawBtn.style.display = 'none';
    }

    showResultData();
}

async function drawRune() {
    if (drawnRune) return; // Already drawn

    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');
    const loadingEl = document.getElementById('loading');

    // UI state
    if (drawBtn) drawBtn.style.display = 'none';
    if (runeEl) {
        runeEl.classList.add('shuffling');
        runeEl.style.pointerEvents = 'none';
    }

    // Play sound / wait for animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Pick random
    const randomIndex = Math.floor(Math.random() * runesData.length);
    drawnRune = runesData[randomIndex];

    // Remove shuffling
    if (runeEl) {
        runeEl.classList.remove('shuffling', 'hidden');
        document.getElementById('rune-symbol').textContent = drawnRune.symbol;
    }

    // Save to local storage
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('runeDaily', JSON.stringify({
        date: today,
        runeData: drawnRune
    }));

    // Show results
    showResultData();
}

function showResultData() {
    const resultFrame = document.getElementById('rune-result');
    if (!resultFrame) return;

    document.getElementById('rune-name').textContent = `${drawnRune.name} ${drawnRune.symbol}`;
    document.getElementById('rune-meaning').textContent = drawnRune.meaning;
    document.getElementById('rune-desc').textContent = drawnRune.description;

    // Show frame nicely
    resultFrame.classList.add('visible');

    // Scroll to it on mobile if needed
    setTimeout(() => {
        resultFrame.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
}

async function requestDeepReading() {
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        const intention = document.getElementById('rune-intention')?.value || '';
        sessionStorage.setItem('pendingRuneContext', JSON.stringify({ rune: drawnRune, intention }));
        window.Auth.showToast('Přihlášení vyžadováno', 'Hluboký výklad run vyžaduje bezplatné přihlášení nebo předplatné.', 'info');
        window.Auth.openModal('login');
        return;
    }

    const intentionInput = document.getElementById('rune-intention');
    const intention = intentionInput ? intentionInput.value.trim() : '';
    const btn = document.getElementById('btn-deep-reading');
    const aiContainer = document.getElementById('ai-response-container');
    const originUpsell = document.getElementById('premium-upsell');

    btn.disabled = true;
    btn.innerHTML = 'Šaman přijímá vedení... <div class="loading__spinner" style="width: 1rem; height: 1rem;"></div>';

    try {
        const response = await fetch(`${apiUrl}/api/runes`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                rune: drawnRune,
                intention
            }),
        });

        const data = await response.json();

        if (response.status === 403) {
            sessionStorage.setItem('pendingRuneContext', JSON.stringify({ rune: drawnRune, intention }));
            window.Auth.showToast('Premium vyžadováno', 'Šamanský výklad vyžaduje prémiové členství Hvězdného Průvodce.', 'info');
            window.Auth.openModal('login');
            return;
        }

        if (!data.success) {
            throw new Error(data.error || 'Neznámá chyba API');
        }

        // Hide upsell block
        originUpsell.style.display = 'none';

        // Show response
        aiContainer.style.display = 'block';
        aiContainer.innerHTML = data.response;

        aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('Deep read failed:', error);
        alert('Nepodařilo se načíst hluboký výklad. Zkuste to prosím znovu.');
        btn.disabled = false;
        btn.innerHTML = 'Získat šamanský výklad (Zkusit znovu)';
    }
}
