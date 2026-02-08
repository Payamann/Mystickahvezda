import { calculateSynastryScores } from './utils/synastry-logic.js';

/**
 * Mystická Hvězda - Synastry Calculator (AI-Powered)
 * Uses Gemini AI for detailed relationship analysis
 */

document.addEventListener('DOMContentLoaded', () => {
    initSynastry();
});

function initSynastry() {
    const form = document.getElementById('synastry-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await calculateCompatibility();
    });

    // Handle "Use my profile" checkbox
    const useProfileCheckbox = document.getElementById('use-profile-p1');
    if (useProfileCheckbox) {
        useProfileCheckbox.addEventListener('change', async (e) => {
            const nameInput = document.getElementById('p1-name');
            const dateInput = document.getElementById('p1-date');

            if (e.target.checked) {
                if (!window.Auth?.token) {
                    window.Auth?.showToast?.('Info', 'Pro použití profilu se prosím přihlaste.', 'info');
                    e.target.checked = false;
                    return;
                }

                try {
                    const user = await window.Auth.getProfile();
                    if (!user) throw new Error('Failed to load profile');

                    if (user.first_name) nameInput.value = user.first_name;

                    if (user.birth_date) {
                        try {
                            const d = new Date(user.birth_date);
                            if (!isNaN(d.getTime())) {
                                dateInput.value = d.toISOString().split('T')[0];
                            } else {
                                dateInput.value = user.birth_date;
                            }
                        } catch (e) {
                            dateInput.value = user.birth_date;
                        }
                    }
                } catch (error) {
                    console.error('Synastry Autofill Error:', error);
                    window.Auth?.showToast?.('Chyba', 'Nepodařilo se načíst data.', 'error');
                    e.target.checked = false;
                }
            }
        });
    }
    // Check visibility on load & auth change
    updateProfileVisibility();
    document.addEventListener('auth:changed', updateProfileVisibility);
    document.addEventListener('auth:refreshed', updateProfileVisibility); // Handle status changes too
}

function updateProfileVisibility() {
    const wrapper = document.getElementById('profile-option-wrapper');
    if (!wrapper) return;

    if (window.Auth && window.Auth.isLoggedIn()) {
        wrapper.style.display = 'flex';
    } else {
        wrapper.style.display = 'none';
        // Uncheck if hidden
        const checkbox = document.getElementById('use-profile-p1');
        if (checkbox) checkbox.checked = false;
    }
}

async function calculateCompatibility() {
    const btn = document.querySelector('#synastry-form button');
    const resultsDiv = document.getElementById('synastry-results');
    const originalText = btn.textContent;

    btn.textContent = 'Analyzuji hvězdy...';
    btn.disabled = true;

    // Get form data
    const person1 = {
        name: document.getElementById('p1-name').value,
        birthDate: document.getElementById('p1-date').value
    };
    const person2 = {
        name: document.getElementById('p2-name').value,
        birthDate: document.getElementById('p2-date').value
    };

    // Calculate scores using imported logic
    const scores = calculateSynastryScores(person1, person2);
    const { emotion: emotionScore, communication: commScore, passion: passionScore, total: totalScore } = scores;

    // Show results with animation
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });

    // Animate scores
    // Check Premium Status for Visuals
    const isPremium = window.Auth && window.Auth.isLoggedIn() && window.Auth.isPremium();

    // Animate Total Score (Always visible)
    animateValue('total-score', 0, totalScore, 2000);
    const heartFill = document.getElementById('heart-anim');
    if (heartFill) {
        heartFill.style.transform = `scaleY(${totalScore / 100})`;
    }

    // Detailed Scores - Gated
    const detailCard = document.querySelector('.card__title').closest('.card');

    // Reset previous state
    const existingOverlay = detailCard.querySelector('.premium-lock-overlay');
    if (existingOverlay) existingOverlay.remove();
    detailCard.classList.remove('blur-content');

    if (isPremium) {
        // Show Real Data
        animateValue('score-emotion', 0, emotionScore, 1500);
        animateValue('score-comm', 0, commScore, 1700);
        animateValue('score-passion', 0, passionScore, 1900);

        document.getElementById('bar-emotion').style.width = `${emotionScore}%`;
        document.getElementById('bar-comm').style.width = `${commScore}%`;
        document.getElementById('bar-passion').style.width = `${passionScore}%`;
    } else {
        // Soft Gate - Obscure Details
        document.getElementById('score-emotion').textContent = '🔒';
        document.getElementById('score-comm').textContent = '🔒';
        document.getElementById('score-passion').textContent = '🔒';

        document.getElementById('bar-emotion').style.width = '0%';
        document.getElementById('bar-comm').style.width = '0%';
        document.getElementById('bar-passion').style.width = '0%';

        // Add Overlay
        detailCard.style.position = 'relative';
        detailCard.style.overflow = 'hidden';

        const overlay = document.createElement('div');
        overlay.className = 'premium-lock-overlay';
        overlay.innerHTML = `
            <div class="lock-icon">🔒</div>
            <h3 style="color: var(--color-mystic-gold); margin-bottom: 0.5rem;">Detailní rozbor</h3>
            <p style="color: var(--color-silver-mist);">Emoce, komunikace a vášeň jsou dostupné pouze pro Hvězdné Průvodce.</p>
            <a href="cenik.html" class="btn btn--primary btn--sm mt-md">Odemknout vše</a>
        `;
        detailCard.appendChild(overlay);
    }



    // Get or create AI results container
    let aiResultsDiv = document.getElementById('ai-synastry');
    if (!aiResultsDiv) {
        aiResultsDiv = createAIResultsContainer();
    }
    aiResultsDiv.style.display = 'none';

    try {
        // Call AI for detailed analysis
        btn.textContent = 'Generuji hlubokou analýzu...';

        // Call API via Auth Wrapper (Protected)
        const response = await Auth.fetchProtected('synastry', {
            person1,
            person2
        });
        const data = await response.json();

        if (data.success) {
            // Update verdict
            document.getElementById('verdict-text').textContent =
                `Celková kompatibilita ${totalScore}% - `;

            // Show AI interpretation
            aiResultsDiv.style.display = 'block';

            if (data.isTeaser) {
                // RENDER TEASER (Blurred)
                renderTeaser(aiResultsDiv);
            } else {
                // RENDER FULL CONTENT
                const contentDiv = aiResultsDiv.querySelector('.ai-content');
                // Remove blur classes if they exist from previous runs
                contentDiv.classList.remove('blur-content');
                const overlay = aiResultsDiv.querySelector('.teaser-overlay');
                if (overlay) overlay.remove();

                await typewriterEffect(contentDiv, data.response);

                // Save to history if logged in
                if (window.Auth && window.Auth.saveReading && !data.isTeaser) {
                    try {
                        await window.Auth.saveReading('synastry', {
                            person1,
                            person2,
                            interpretation: data.response,
                            scores: { totalScore, emotionScore, commScore, passionScore }
                        });
                        // Add favorite button for synastry? Maybe later.
                    } catch (e) {
                        console.warn('Failed to auto-save synastry reading:', e);
                    }
                }
            }
        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('Synastry Error:', error);

        // Fallback to static verdict
        let verdict = "";
        if (totalScore > 85) verdict = "Osudové spojení! Hvězdy vám přejí.";
        else if (totalScore > 70) verdict = "Velmi silný pár s harmonickými aspekty.";
        else verdict = "Vztah s potenciálem, který vyžaduje práci.";
        document.getElementById('verdict-text').textContent = verdict;

        aiResultsDiv.style.display = 'block';
        aiResultsDiv.querySelector('.ai-content').textContent =
            'Hlubší analýza momentálně není dostupná. Zkuste to prosím později.';
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

function createAIResultsContainer() {
    const container = document.createElement('div');
    container.id = 'ai-synastry';
    container.style.cssText = `
        margin-top: var(--space-xl);
        padding: var(--space-xl);
        background: linear-gradient(135deg, rgba(219, 39, 119, 0.1) 0%, rgba(10, 10, 26, 0.9) 100%);
        border: 1px solid rgba(219, 39, 119, 0.5);
        border-radius: var(--radius-lg);
    `;
    container.innerHTML = `
        <h4 style="color: #ec4899; margin-bottom: var(--space-md);">
            💕 Hluboká analýza vašeho vztahu
        </h4>
        <div class="ai-content" style="color: var(--color-starlight); line-height: 1.8; white-space: pre-wrap;"></div>
    `;

    // Insert after synastry-results
    const results = document.getElementById('synastry-results');
    results.appendChild(container);

    return container;
}

async function typewriterEffect(element, text) {
    element.textContent = '';
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        element.textContent += chars[i];
        if (i % 100 === 0) {
            element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        await new Promise(resolve => setTimeout(resolve, 15));
    }
}

function renderTeaser(container) {
    const contentDiv = container.querySelector('.ai-content');

    // 1. Add Blur
    contentDiv.classList.add('blur-content');

    // 2. Set Dummy Text for visual bulk
    contentDiv.innerHTML = `
        <p>Váš vztah vykazuje silné karmické propojení, které se projevuje zejména v oblasti emocí. Hvězdy naznačují, že jste se nepotkali náhodou.</p>
        <p>Ačkoliv je vaše komunikace dynamická, existují zde aspekty, na které si musíte dát pozor. Saturn ve vašem horoskopu vytváří...</p>
        <p>Pro dlouhodobou stabilitu je klíčové pochopit...</p>
        <br><br><br>
    `;

    // 3. Add Overlay Button
    // Check if overlay already exists
    if (!container.querySelector('.teaser-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'teaser-overlay';
        overlay.innerHTML = `
            <div style="background: rgba(10, 10, 26, 0.9); padding: 2rem; border-radius: 12px; border: 1px solid var(--color-mystic-gold); box-shadow: 0 0 20px rgba(212, 175, 55, 0.2); display: inline-block;">
                <h3 style="color: var(--color-mystic-gold); margin-bottom: 1rem;">Odemkněte tajemství vašeho vztahu</h3>
                <p style="color: #ccc; margin-bottom: 1.5rem;">Zjistěte, proč máte ${document.getElementById('total-score').textContent} shodu a co vás čeká.</p>
                <a href="cenik.html" class="btn btn--primary">Odemknout plný rozbor (199 Kč)</a>
            </div>
        `;
        container.style.position = 'relative'; // Ensure positioning context
        container.appendChild(overlay);
    }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));

    const timer = setInterval(function () {
        current += increment;
        obj.textContent = current + "%";
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}
