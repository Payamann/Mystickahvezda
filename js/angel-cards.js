/**
 * Angel Cards Logic
 * Handles card drawing, 3D animations, and API communication for deep readings.
 */

// Access global variables and functions exposed by api-config.js and auth-client.js
const { apiUrl, authHeaders } = window;

let angelCardsData = [];
let drawnCard = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load card database
    try {
        const res = await fetch('data/angel-cards.json');
        if (!res.ok) throw new Error('Nepodařilo se načíst databázi karet.');
        angelCardsData = await res.json();
    } catch (error) {
        console.error('Error loading angel cards:', error);
        alert('Došlo k chybě při načítání karet. Zkuste prosím obnovit stránku.');
        return;
    }

    // 2. Check Daily Lock
    checkDailyLock();

    // 3. Attach listeners
    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) {
        drawBtn.addEventListener('click', drawCard);

        // Add ambient light effect to mouse move
        drawBtn.addEventListener('mousemove', handleMouseMove);
        drawBtn.addEventListener('mouseleave', () => {
            const inner = drawBtn.querySelector('.angel-card-inner');
            if (inner && !drawBtn.classList.contains('is-flipped')) {
                inner.style.transform = `rotateX(0deg) rotateY(0deg)`;
            }
        });
    }

    const deepReadBtn = document.getElementById('btn-deep-read');
    if (deepReadBtn) {
        deepReadBtn.addEventListener('click', requestDeepReading);
    }

    // 4. Action buttons
    const saveBtn = document.getElementById('btn-save-reading');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert('Tato funkce se právě připravuje. Brzy si budete moci ukládat výklady přímo do svého Hvězdného Deníku! ⭐');
        });
    }

    const shareBtn = document.getElementById('btn-share-card');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareCard);
    }
});

/**
 * Handles sharing the drawn card using the Web Share API if available.
 */
function shareCard() {
    if (!drawnCard) return;

    const shareTitle = `Moje andělská karta dne: ${drawnCard.name} ✨`;
    const shareText = `Dnes mě provází anděl ${drawnCard.name} s tématem: ${drawnCard.theme}. Zjistěte, jaká karta čeká na vás na Mystické Hvězdě! 🕊️`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch(err => {
            console.warn('Share API failed:', err);
        });
    } else {
        // Fallback for desktop/unsupported browsers
        navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n${shareUrl}`).then(() => {
            alert('Odkaz a poselství byly zkopírovány do schránky! Můžete je vložit přátelům.');
        }).catch(err => {
            console.error('Clipboard failed', err);
            alert('Bohužel se nepodařilo zkopírovat odkaz.');
        });
    }
}

/**
 * Checks if the user has already drawn a card today and sets up the UI accordingly.
 */
function checkDailyLock() {
    const today = new Date().toISOString().split('T')[0];
    const savedDataStr = localStorage.getItem('angelCardDaily');

    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            if (savedData.date === today && savedData.cardData) {
                // User already drew a card today
                drawnCard = savedData.cardData;
                revealPreDrawnCard();
            } else {
                // Different day, clear the old reading to be safe
                localStorage.removeItem('angelCardDaily');
            }
        } catch (e) {
            console.error('Error parsing daily card:', e);
            localStorage.removeItem('angelCardDaily');
        }
    }
}

/**
 * Bypasses the animation for returning users and shows their already drawn card.
 */
function revealPreDrawnCard() {
    const container = document.getElementById('draw-btn');
    if (!container) return;

    // Populate Back of Card
    const backEl = container.querySelector('.angel-card-back');
    if (backEl) {
        const archetype = drawnCard.archetype || 'guidance';
        backEl.style.backgroundImage = `linear-gradient(to bottom, rgba(20, 15, 30, 0.3), rgba(20, 15, 30, 0.9)), url('img/angel-archetypes/${archetype}.webp')`;
        backEl.style.backgroundSize = 'cover';
        backEl.style.backgroundPosition = 'center';
        backEl.innerHTML = `
            <div class="angel-card-overlay"></div>
            <div class="angel-card-content">
                <div style="font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));">✨</div>
                <h3 class="angel-name">${drawnCard.name}</h3>
                <div class="angel-theme">${drawnCard.theme}</div>
            </div>
        `;
    }

    // Populate Results Area
    const shortMessageEl = document.getElementById('angel-short-message');
    if (shortMessageEl) {
        shortMessageEl.textContent = drawnCard.short_message;
    }

    // Skip animation lock
    const inner = container.querySelector('.angel-card-inner');
    if (inner) inner.style.transform = '';
    // Turn off transition temporarily so it just appears flipped
    if (inner) inner.style.transition = 'none';

    container.classList.add('is-flipped');
    container.classList.remove('glow-effect');
    container.style.cursor = 'default';

    // Show results section immediately
    const intro = document.getElementById('angel-intro');
    if (intro) {
        const introTexts = intro.querySelectorAll('p');
        introTexts.forEach(p => p.style.display = 'none');

        // Add a small title for returning users
        const returnMsg = document.createElement('p');
        returnMsg.className = 'mb-xl text-lg w-mx-md mx-auto';
        returnMsg.style.color = 'var(--color-silver-mist)';
        returnMsg.innerHTML = '<em>Pro tento den už k vám andělé promluvili...</em>';
        intro.prepend(returnMsg);
    }

    const results = document.getElementById('angel-results');
    if (results) {
        results.style.display = 'block';
        results.style.opacity = '1';
        results.style.transform = 'translateY(0)';
    }

    // Restore transition after a tiny delay so future interactions aren't broken
    setTimeout(() => {
        if (inner) inner.style.transition = '';
    }, 50);
}

/**
 * Creates a subtle 3D tilt effect before drawing
 */
function handleMouseMove(e) {
    const cardEl = e.currentTarget;
    if (cardEl.classList.contains('is-flipped')) return;

    const rect = cardEl.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top; // y position within the element

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    const inner = cardEl.querySelector('.angel-card-inner');
    if (inner) {
        inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
}

/**
 * Draws a random angel card and triggers the flip animation
 */
function drawCard() {
    const container = document.getElementById('draw-btn');
    if (container.classList.contains('is-flipped')) return; // Already drawn

    // Select random card
    const randomIndex = Math.floor(Math.random() * angelCardsData.length);
    drawnCard = angelCardsData[randomIndex];

    // Save to Daily Lock
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('angelCardDaily', JSON.stringify({
        date: today,
        cardData: drawnCard
    }));

    // Populate Back of Card
    const backEl = container.querySelector('.angel-card-back');
    if (backEl) {
        // We will use a soft abstract background image or CSS gradient
        const archetype = drawnCard.archetype || 'guidance';
        backEl.style.backgroundImage = `linear-gradient(to bottom, rgba(20, 15, 30, 0.3), rgba(20, 15, 30, 0.9)), url('img/angel-archetypes/${archetype}.webp')`;
        backEl.style.backgroundSize = 'cover';
        backEl.style.backgroundPosition = 'center';
        backEl.innerHTML = `
            <div class="angel-card-overlay"></div>
            <div class="angel-card-content">
                <div style="font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));">✨</div>
                <h3 class="angel-name">${drawnCard.name}</h3>
                <div class="angel-theme">${drawnCard.theme}</div>
            </div>
        `;
    }

    // Populate Results Area
    const shortMessageEl = document.getElementById('angel-short-message');
    if (shortMessageEl) {
        shortMessageEl.textContent = drawnCard.short_message;
    }

    // Trigger Flip
    // Reset any transform from mouse move
    const inner = container.querySelector('.angel-card-inner');
    if (inner) inner.style.transform = '';

    container.classList.add('is-flipped');
    container.classList.remove('glow-effect');
    container.style.cursor = 'default';

    // Show results section after flip completes smoothly
    setTimeout(() => {
        const intro = document.getElementById('angel-intro');
        if (intro) {
            // Hide intro text
            const introTexts = intro.querySelectorAll('p');
            introTexts.forEach(p => p.style.opacity = '0');
        }

        const results = document.getElementById('angel-results');
        if (results) {
            results.style.display = 'block';
            // Trigger animation frame
            requestAnimationFrame(() => {
                results.classList.add('animate-in');
            });
        }
    }, 800);
}

/**
 * Requests deep AI reading from the backend
 */
async function requestDeepReading() {
    if (!drawnCard) return;

    if (!window.Auth || !window.Auth.isLoggedIn()) {
        window.Auth?.openModal();
        return;
    }

    const aiResultContainer = document.getElementById('angel-ai-result');
    const aiContent = document.getElementById('ai-reading-content');
    const btn = document.getElementById('btn-deep-read');

    // Show loading state
    aiResultContainer.style.display = 'block';
    aiContent.innerHTML = `
        <div class="text-center p-xl">
            <div class="loading-spinner"></div>
            <p class="mt-md" style="color: var(--color-silver-mist);">Andělé připravují vaše poselství...</p>
        </div>
    `;
    btn.disabled = true;

    try {
        const response = await fetch(`${apiUrl()}/oracle/angel-card`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({
                card: {
                    name: drawnCard.name,
                    theme: drawnCard.theme
                },
                intention: document.getElementById('user-intention')?.value?.trim() || 'obecný vhled do dnešního dne'
            })
        });

        const data = await response.json();

        // Handle Non-Premium Teaser View
        if (data.isTeaser) {
            window.Auth?.showToast('Premium vyžadováno', 'Pro získání hlubokého duchovního vhledu z Vaší Andělské karty potřebujete členství Hvězdný Průvodce.', 'info');
            window.Auth?.openModal('login');
            aiResultContainer.style.display = 'none';
            return;
        }

        if (data.success && data.response) {
            // Parse HTML response and inject
            aiContent.innerHTML = data.response;
            btn.style.display = 'none'; // Hide the deep read button since we already have it
        } else {
            throw new Error(data.error || 'Neznámá chyba při komunikaci s nebem.');
        }

    } catch (error) {
        console.error('Deep reading error:', error);
        aiContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">⚠️</div>
                <p class="empty-state__text">${error.message}</p>
                <button class="btn btn--glass btn--sm mt-md" onclick="location.reload()">Zkusit znovu</button>
            </div>
        `;
    } finally {
        btn.disabled = false;
    }
}
