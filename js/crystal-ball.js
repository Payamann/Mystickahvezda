/**
 * Mystická Hvězda - Crystal Ball (AI-Powered)
 * Uses Gemini AI for mystical, contextual oracle responses
 */

let questionHistory = [];
const COOLDOWN_SECONDS = 10;

document.addEventListener('DOMContentLoaded', () => {
    initCrystalBall();
});

function initCrystalBall() {
    const ballContainer = document.getElementById('crystal-ball');
    // Note: 'answer' ID is now below the ball in the HTML update
    const answerContainer = document.getElementById('answer-container');
    const answerText = document.getElementById('answer-text');
    const resetBtn = document.getElementById('reset-btn');
    const questionInput = document.getElementById('question-input');
    const askBtn = document.getElementById('ask-btn');
    const bannerUpgradeBtn = document.getElementById('crystal-banner-upgrade');

    if (!ballContainer) return;

    let isThinking = false;
    let cooldownTimer = null;

    function startCrystalCheckout(source, authMode = 'register') {
        window.Auth?.startPlanCheckout?.('pruvodce', {
            source,
            feature: 'kristalova_koule',
            redirect: '/cenik.html',
            authMode
        });
    }

    if (bannerUpgradeBtn) {
        bannerUpgradeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            startCrystalCheckout('crystal_ball_banner_upgrade', 'register');
        });
    }

    // Check availability based on last usage
    function getRemainingCooldown() {
        const lastUsage = localStorage.getItem('crystalBall_lastUsage');
        if (!lastUsage) return 0;

        const elapsed = (Date.now() - parseInt(lastUsage)) / 1000;
        return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
    }

    // Update UI based on cooldown
    function updateCooldownUI() {
        const remaining = getRemainingCooldown();
        if (remaining > 0) {
            if (askBtn) {
                askBtn.disabled = true;
                askBtn.innerText = `Koule čerpá energii (${remaining}s)`;
                askBtn.style.opacity = '0.6';
                askBtn.style.cursor = 'not-allowed';
            }
            if (ballContainer) ballContainer.style.cursor = 'not-allowed';

            // Re-check every second
            clearTimeout(cooldownTimer);
            cooldownTimer = setTimeout(updateCooldownUI, 1000);
        } else {
            if (askBtn) {
                askBtn.disabled = false;
                askBtn.innerText = 'Zeptat se koule';
                askBtn.style.opacity = '1';
                askBtn.style.cursor = 'pointer';
            }
            if (ballContainer) ballContainer.style.cursor = 'pointer';
        }
    }

    // Initial check
    updateCooldownUI();

    // Function to ask the oracle
    async function askOracle(question) {
        // Restriction: Must be logged in
        if (!window.Auth || !window.Auth.isLoggedIn()) {
            window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro radu od křišťálové koule se prosím přihlaste.', 'info');
            startCrystalCheckout('crystal_ball_auth_gate', 'login');
            return;
        }

        const remaining = getRemainingCooldown();
        if (remaining > 0) return; // Prevent spam

        if (isThinking || !question.trim()) return;

        if (question.length > 200) {
            window.Auth?.showToast?.('Příliš dlouhá', 'Otázka je příliš dlouhá. Prosím, zkraťte ji.', 'info');
            return;
        }

        isThinking = true;

        // Reset state
        if (answerContainer) answerContainer.classList.remove('visible');
        if (answerText) answerText.textContent = '';
        if (resetBtn) {
            resetBtn.style.opacity = '0';
            resetBtn.style.pointerEvents = 'none';
        }

        // Animation
        ballContainer.classList.add('shaking');
        if (navigator.vibrate) navigator.vibrate(200);

        try {
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || '/api'}/crystal-ball`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                },
                body: JSON.stringify({
                    question: question.trim(),
                    history: questionHistory.slice(-5)
                })
            });

            const data = await response.json();

            ballContainer.classList.remove('shaking');

            // Record usage time for cooldown
            localStorage.setItem('crystalBall_lastUsage', Date.now().toString());
            updateCooldownUI();

            if (data.success) {
                questionHistory.push(question.trim());
                if (answerContainer) answerContainer.classList.add('visible');
                if (answerText) await typewriterEffect(answerText, data.response);

                // Save to history if logged in
                if (window.Auth && window.Auth.saveReading) {
                    const saveResult = await window.Auth.saveReading('crystal-ball', {
                        question: question.trim(),
                        answer: data.response
                    });

                    // Store reading ID and add favorite button
                    if (saveResult && saveResult.id) {
                        window.currentCrystalReadingId = saveResult.id;

                        // Add favorite button after answer
                        const favoriteBtn = document.createElement('div');
                        favoriteBtn.className = 'text-center';
                        favoriteBtn.style.marginTop = 'var(--space-lg)';
                        favoriteBtn.innerHTML = `
                            <button id="favorite-crystal-btn" class="btn btn--glass" style="min-width: 200px;">
                                <span class="favorite-icon">⭐</span> Přidat do oblíbených
                            </button>
                        `;
                        answerContainer.appendChild(favoriteBtn);

                        // Attach listener
                        document.getElementById('favorite-crystal-btn').addEventListener('click', async () => {
                            await window.toggleFavorite(window.currentCrystalReadingId, 'favorite-crystal-btn');
                        });
                    }
                }
            } else {
                if (response.status === 402 || response.status === 403 || (data.error && data.error.toLowerCase().includes('limit'))) {
                    if (answerContainer) answerContainer.classList.remove('visible');
                    window.Auth?.showToast?.('Limit dosažen', 'Chceš neomezené odpovědi? Aktivuj si Hvězdného Průvodce.', 'info');
                    startCrystalCheckout('crystal_ball_limit_gate', 'register');
                } else {
                    if (answerContainer) answerContainer.classList.add('visible');
                    if (answerText) answerText.textContent = data.error || 'Hvězdy mlčí...';
                }
            }

        } catch (error) {
            console.error('Oracle Error:', error);
            ballContainer.classList.remove('shaking');
            if (answerContainer) answerContainer.classList.add('visible');
            if (answerText) answerText.textContent = 'Spojení přerušeno.';
        }

        // Show reset btn
        setTimeout(() => {
            if (resetBtn) {
                resetBtn.style.opacity = '1';
                resetBtn.style.pointerEvents = 'auto';
            }
            isThinking = false;
        }, 500);
    }

    async function typewriterEffect(element, text) {
        element.textContent = '';
        const chars = text.split('');
        for (let i = 0; i < chars.length; i++) {
            element.textContent += chars[i];
            await new Promise(resolve => setTimeout(resolve, 30));
        }
    }

    // Events
    ballContainer.addEventListener('click', () => {
        if (getRemainingCooldown() > 0) return; // Ignore clicks during cooldown

        if (questionInput && questionInput.value.trim()) {
            askOracle(questionInput.value);
        } else {
            questionInput.focus();
            questionInput.classList.add('shake-input'); // Visual cue (needs CSS)
            setTimeout(() => questionInput.classList.remove('shake-input'), 500);
        }
    });

    if (askBtn) {
        askBtn.addEventListener('click', () => {
            if (questionInput) askOracle(questionInput.value);
        });
    }

    if (questionInput) {
        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askOracle(questionInput.value);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (answerContainer) {
                answerContainer.classList.remove('visible');
                // Remove accumulated favorite buttons
                answerContainer.querySelectorAll('.text-center').forEach(el => el.remove());
            }
            if (questionInput) {
                questionInput.value = '';
                questionInput.focus();
            }
            resetBtn.style.opacity = '0';
            resetBtn.style.pointerEvents = 'none';
        });
    }
}
