/**
 * Mystická Hvězda - Profile Page Logic
 * Handles user dashboard, reading history, and settings
 */

// Track if listeners are already attached to prevent duplicates
let listenersAttached = false;

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    // Re-run init when auth state changes (e.g. login via modal)
    document.addEventListener('auth:changed', () => initProfile());
});

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function initProfile() {
    // Wait for Auth to be ready with retry
    let retries = 0;
    while (!window.Auth && retries < 10) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }

    const user = window.Auth?.user;
    const isLoggedIn = window.Auth?.isLoggedIn();

    const loginRequired = document.getElementById('login-required');
    const dashboard = document.getElementById('profile-dashboard');
    const greeting = document.getElementById('profile-greeting');

    if (!isLoggedIn) {
        // Not logged in
        if (loginRequired) loginRequired.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
        if (greeting) greeting.textContent = 'Přihlaste se pro zobrazení vašeho profilu';

        // Use event delegation or one-time listener to prevent duplicates
        const loginBtn = document.getElementById('profile-login-btn');
        if (loginBtn && !loginBtn.dataset.listenerAttached) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.Auth?.openModal();
            });
            loginBtn.dataset.listenerAttached = 'true';
        }
        return;
    }

    // User is logged in
    if (loginRequired) loginRequired.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    // Populate user info
    if (user) {
        if (greeting) greeting.textContent = `Vítejte zpět, ${user.email.split('@')[0]}! ✨`;
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email;

        const planEl = document.getElementById('user-plan');
        if (planEl) planEl.textContent = formatPlan(user.subscription_status);

        const creditsEl = document.getElementById('user-credits');
        if (creditsEl) creditsEl.textContent = `${user.credits ?? '∞'} kreditů`;

        const settingsEmail = document.getElementById('settings-email');
        if (settingsEmail) settingsEmail.value = user.email;

        // Populate personal info
        if (document.getElementById('settings-name')) document.getElementById('settings-name').value = user.first_name || '';

        if (document.getElementById('settings-birthdate')) {
            let val = user.birth_date || '';
            if (val && val.includes('T')) val = val.split('T')[0];
            document.getElementById('settings-birthdate').value = val;
        }

        if (document.getElementById('settings-birthtime')) {
            let val = user.birth_time || '';
            // Ensure HH:mm (remove seconds)
            if (val && val.length > 5) val = val.substring(0, 5);
            document.getElementById('settings-birthtime').value = val;
        }

        if (document.getElementById('settings-birthplace')) document.getElementById('settings-birthplace').value = user.birth_place || '';

        // Hide upgrade card for premium users
        if (user.subscription_status?.includes('premium')) {
            const upgradeCard = document.getElementById('upgrade-card');
            if (upgradeCard) upgradeCard.style.display = 'none';
        }
    }

    // Setup tabs (only once)
    initTabs();

    // Load reading history and stats
    const readings = await loadReadings();
    updateStats(readings);

    // NEW: Load Journal and Biorhythms
    if (user.birth_date) {
        initBiorhythms(user.birth_date);
    }
    loadJournal();

    // Setup event listeners ONLY ONCE
    if (!listenersAttached) {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveSettings);
        }

        listenersAttached = true;
    }
}

// Named handler to allow proper cleanup
function handleLogout() {
    if (confirm('Opravdu se chcete odhlásit?')) {
        window.Auth?.logout();
    }
}

// Stats calculation and display
function updateStats(readings) {
    if (!readings) readings = [];

    // Total readings
    const total = readings.length;

    // This month
    const now = new Date();
    const thisMonth = readings.filter(r => {
        const date = new Date(r.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    // Favorites (if field exists)
    const favorites = readings.filter(r => r.is_favorite).length;

    // Calculate streak (consecutive days with readings)
    const streak = calculateStreak(readings);

    // Animate counters
    animateCounter('stat-total', total);
    animateCounter('stat-month', thisMonth);
    animateCounter('stat-favorites', favorites);
    animateCounter('stat-streak', streak);
}

function calculateStreak(readings) {
    if (!readings.length) return 0;

    const dates = readings.map(r => new Date(r.created_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if there's a reading today or yesterday
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let checkDate = new Date(uniqueDates[0]);
    for (const dateStr of uniqueDates) {
        if (new Date(dateStr).toDateString() === checkDate.toDateString()) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
            break;
        }
    }

    return streak;
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        el.textContent = Math.round(start + (target - start) * eased);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function formatPlan(plan) {
    const plans = {
        'free': '🆓 Zdarma',
        'premium_monthly': '⭐ Premium (měsíční)',
        'premium_yearly': '💎 Premium (roční)'
    };
    return plans[plan] || plan || 'Zdarma';
}

// Track if tabs are initialized to prevent duplicate listeners
let tabsInitialized = false;

function initTabs() {
    if (tabsInitialized) return;

    // Support both old (.tab) and new (.profile-tab) class names
    const tabs = document.querySelectorAll('.tab[data-tab], .profile-tab[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Update content
            contents.forEach(c => {
                c.style.display = c.id === `tab-${targetId}` ? 'block' : 'none';
            });

            // Load favorites when that tab is clicked
            if (targetId === 'favorites') {
                loadFavorites();
            }
        });
    });

    tabsInitialized = true;
}

async function loadReadings() {
    const container = document.getElementById('readings-list');

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings`, {
            headers: {
                'Authorization': `Bearer ${window.Auth?.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load readings');
        }

        const data = await response.json();
        const readings = data.readings || [];

        if (readings.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔮</div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--color-starlight);">Zatím nemáte žádné výklady</h4>
                    <p style="opacity: 0.6; margin-bottom: 1.5rem;">Vydejte se na cestu za poznáním hvězd!</p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <a href="tarot.html" class="btn btn--primary btn--sm">🃏 Tarot</a>
                        <a href="kristalova-koule.html" class="btn btn--glass btn--sm">🔮 Křišťálová koule</a>
                        <a href="horoskopy.html" class="btn btn--glass btn--sm">⭐ Horoskop</a>
                    </div>
                </div>
            `;
            return readings;
        }

        container.innerHTML = readings.map(reading => `
            <div class="reading-item card" style="margin-bottom: 1rem; padding: 1rem; cursor: pointer;" onclick="viewReading('${escapeHtml(reading.id)}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 2rem;">${getReadingIcon(reading.type)}</span>
                        <div>
                            <strong>${escapeHtml(getReadingTitle(reading.type))}</strong>
                            <p style="margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.85rem;">
                                ${new Date(reading.created_at).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(reading.id)}', this)" title="${reading.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}">
                            ${reading.is_favorite ? '⭐' : '☆'}
                        </button>
                        <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); viewReading('${escapeHtml(reading.id)}')">Zobrazit</button>
                    </div>
                </div>
            </div>
        `).join('');

        return readings;

    } catch (error) {
        console.error('Error loading readings:', error);
        container.innerHTML = `
            <p class="text-center" style="opacity: 0.6;">
                Nepodařilo se načíst historii. <a href="javascript:location.reload()">Zkusit znovu</a>
            </p>
        `;
        return [];
    }
}

// NEW: Load favorite readings
async function loadFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; opacity: 0.6;">Načítání...</p>';

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings`, {
            headers: {
                'Authorization': `Bearer ${window.Auth?.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load readings');

        const data = await response.json();
        const favorites = (data.readings || []).filter(r => r.is_favorite);

        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⭐</div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--color-starlight);">Žádné oblíbené výklady</h4>
                    <p style="opacity: 0.6;">Klikněte na ☆ u výkladu pro přidání do oblíbených</p>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(reading => `
            <div class="reading-item card" style="margin-bottom: 1rem; padding: 1rem; cursor: pointer;" onclick="viewReading('${escapeHtml(reading.id)}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 2rem;">${getReadingIcon(reading.type)}</span>
                        <div>
                            <strong>${escapeHtml(getReadingTitle(reading.type))}</strong>
                            <p style="margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.85rem;">
                                ${new Date(reading.created_at).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(reading.id)}', this)" title="Odebrat z oblíbených">⭐</button>
                        <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); viewReading('${escapeHtml(reading.id)}')">Zobrazit</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = '<p style="text-align: center; opacity: 0.6;">Nepodařilo se načíst oblíbené.</p>';
    }
}

function getReadingIcon(type) {
    const icons = {
        'tarot': '🃏',
        'horoscope': '♈',
        'natal': '🌌',
        'natal-chart': '🌌',
        'numerology': '🔢',
        'synastry': '💕',
        'crystal': '🔮',
        'journal': '📖'
    };
    return icons[type] || '✨';
}

function getReadingTitle(type) {
    const titles = {
        'tarot': 'Tarotový výklad',
        'horoscope': 'Horoskop',
        'natal': 'Natální karta',
        'natal-chart': 'Natální karta',
        'numerology': 'Numerologie',
        'synastry': 'Partnerská shoda',
        'crystal': 'Křišťálová koule',
        'journal': 'Manifestační deník'
    };
    return titles[type] || 'Výklad';
}

// Current reading being viewed (for modal actions)
let currentReadingId = null;
let currentReadingIsFavorite = false;

async function viewReading(id) {
    const modal = document.getElementById('reading-modal');
    const content = document.getElementById('reading-modal-content');

    if (!modal || !content) return;

    currentReadingId = id;
    modal.style.display = 'flex';
    content.innerHTML = '<p style="text-align: center; opacity: 0.6;">Načítání...</p>';

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings/${id}`, {
            headers: {
                'Authorization': `Bearer ${window.Auth?.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch reading');

        const data = await response.json();
        const reading = data.reading;

        currentReadingIsFavorite = reading.is_favorite;
        updateFavoriteButton();

        // Render reading content based on type
        content.innerHTML = renderReadingContent(reading);

    } catch (error) {
        console.error('Error loading reading:', error);
        content.innerHTML = `<p style="color: #e74c3c;">Nepodařilo se načíst výklad.</p>`;
    }
}

function renderReadingContent(reading) {
    const date = new Date(reading.created_at).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let contentHtml = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <span style="font-size: 3rem;">${getReadingIcon(reading.type)}</span>
            <h2 style="margin: 0.5rem 0;">${escapeHtml(getReadingTitle(reading.type))}</h2>
            <p style="opacity: 0.6; font-size: 0.9rem;">${date}</p>
        </div>
        <div class="reading-content" style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 10px; max-height: 400px; overflow-y: auto;">
    `;

    // Safely parse and display the reading data with null check
    const data = reading.data || {};

    // Helper to get image path from card name
    function getTarotImageByName(name) {
        if (!name) return 'img/tarot/tarot_placeholder.webp';

        // Transform "Čtyřka pentáklů" -> "ctyrka_pentaklu"
        const normalized = name.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ /g, '_');

        return `img/tarot/tarot_${normalized}.webp`;
    }

    if (reading.type === 'tarot' && data.cards) {
        contentHtml += `<div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-bottom: 1.5rem;">`;
        data.cards.forEach(card => {
            // Use dynamic mapping first, then fallback to saved image, then placeholder
            const imagePath = getTarotImageByName(card.name);

            contentHtml += `
                <div style="text-align: center; width: 100px; display: flex; flex-direction: column; align-items: center;">
                    <div style="position: relative; width: 80px; height: 120px; margin-bottom: 0.5rem; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                         <img src="${escapeHtml(imagePath)}" 
                              alt="${escapeHtml(card.name)}" 
                              onerror="this.onerror=null;this.src='img/tarot/tarot_placeholder.webp';this.parentElement.style.border='1px solid rgba(255,255,255,0.1)';"
                              style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    </div>
                    <p style="font-size: 0.75rem; margin: 0; font-weight: 600; color: var(--color-mystic-gold); line-height: 1.2;">${escapeHtml(card.name)}</p>
                    ${card.position ? `<small style="font-size: 0.65rem; opacity: 0.7;">${escapeHtml(card.position)}</small>` : ''}
                </div>
            `;
        });
        contentHtml += `</div>`;

        const summary = data.response || data.interpretation;
        if (summary) {
            contentHtml += `
                <div style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 8px; border-left: 3px solid var(--color-mystic-gold);">
                    <h4 style="color: var(--color-mystic-gold); margin-bottom: 0.75rem; font-size: 1rem;">VÝKLAD KARET</h4>
                    <div style="line-height: 1.8; font-size: 1rem; color: var(--color-silver-mist);">
                        ${summary.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        }
    } else if (reading.type === 'horoscope' && (data.text || data.prediction)) {
        const text = data.text || data.prediction;
        const periodMap = { 'daily': 'Denní horoskop', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' };
        const periodLabel = periodMap[data.period] || data.period || 'Horoskop';

        contentHtml += `
            <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: var(--color-mystic-gold); font-size: 1.5rem; margin-bottom: 0.2rem;">${escapeHtml(data.sign || 'Znamení')}</h3>
                <span style="text-transform: uppercase; letter-spacing: 2px; font-size: 0.75rem; opacity: 0.7;">${escapeHtml(periodLabel)}</span>
            </div>
            <div style="font-size: 1.05rem; line-height: 1.8; color: var(--color-starlight); margin-bottom: 1.5rem;">
                ${escapeHtml(text)}
            </div>
        `;

        if (data.luckyNumbers) {
            contentHtml += `
                <div style="background: rgba(212, 175, 55, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 0.8rem; text-transform: uppercase; color: var(--color-mystic-gold); margin-bottom: 0.25rem;">Šťastná čísla</span>
                    <span style="font-family: var(--font-heading); font-size: 1.2rem; letter-spacing: 1px;">${escapeHtml(data.luckyNumbers.toString())}</span>
                </div>
            `;
        }
    } else if (data.answer) {
        // Crystal Ball or generic Q&A format
        if (data.question) {
            contentHtml += `
                <div style="margin-bottom: 1.5rem; padding: 1rem; border-left: 3px solid var(--color-mystic-gold); background: rgba(255,255,255,0.03);">
                    <small style="text-transform: uppercase; color: var(--color-mystic-gold); font-size: 0.7rem; display: block; margin-bottom: 0.3rem;">Otázka</small>
                    <p style="font-style: italic; opacity: 0.9; margin: 0; font-family: var(--font-heading); font-size: 1.1rem;">"${escapeHtml(data.question)}"</p>
                </div>
            `;
        }
        contentHtml += `
            <div style="font-size: 1.05rem; line-height: 1.8; color: var(--color-starlight);">
                ${escapeHtml(data.answer)}
            </div>
        `;
    } else if (data.interpretation || data.text || data.result) {
        let content = data.interpretation || data.text || data.result;

        // Check if content looks like HTML (contains tags)
        if (typeof content === 'string' && /<[a-z][\s\S]*>/i.test(content)) {
            // It's HTML - cleanup HTML/BODY tags if present to avoid nesting issues
            content = content.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');
            // Render as HTML
            contentHtml += `<div class="formatted-content" style="line-height: 1.7; color: var(--color-starlight);">${content}</div>`;
        } else {
            // It's plain text - escape it
            contentHtml += `<p style="line-height: 1.7;">${escapeHtml(content)}</p>`;
        }
    } else {
        // Generic JSON display for unknown formats - escaped
        contentHtml += `<pre style="white-space: pre-wrap; font-size: 0.85rem;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    }

    contentHtml += `</div>`;
    return contentHtml;
}

function closeReadingModal() {
    const modal = document.getElementById('reading-modal');
    if (modal) modal.style.display = 'none';
    currentReadingId = null;
}

function updateFavoriteButton() {
    const btn = document.getElementById('modal-favorite-btn');
    if (btn) {
        btn.textContent = currentReadingIsFavorite ? '⭐ V oblíbených' : '☆ Přidat do oblíbených';
    }
}

async function toggleFavoriteModal() {
    if (!currentReadingId) return;
    await toggleFavorite(currentReadingId);
    currentReadingIsFavorite = !currentReadingIsFavorite;
    updateFavoriteButton();
}

async function toggleFavorite(id, buttonEl = null) {
    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings/${id}/favorite`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${window.Auth?.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to toggle favorite');

        const data = await response.json();

        // Update button if provided
        if (buttonEl) {
            buttonEl.textContent = data.is_favorite ? '⭐' : '☆';
            buttonEl.title = data.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených';
        }

        // Refresh stats and favorites
        const readings = await loadReadings();
        updateStats(readings);

        // Also refresh favorites tab if visible
        const favoritesTab = document.getElementById('tab-favorites');
        if (favoritesTab && favoritesTab.style.display !== 'none') {
            loadFavorites();
        }

    } catch (error) {
        console.error('Error toggling favorite:', error);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se změnit oblíbené.', 'error');
    }
}

async function deleteReading() {
    if (!currentReadingId) return;

    if (!confirm('Opravdu chcete smazat tento výklad? Tuto akci nelze vrátit.')) {
        return;
    }

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings/${currentReadingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.Auth?.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete reading');

        closeReadingModal();
        window.Auth?.showToast?.('Smazáno', 'Výklad byl úspěšně smazán.', 'success');

        // Refresh readings
        const readings = await loadReadings();
        updateStats(readings);

    } catch (error) {
        console.error('Error deleting reading:', error);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se smazat výklad.', 'error');
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('reading-modal');
    if (e.target === modal) {
        closeReadingModal();
    }
});

// Bind Journal Button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('journal-submit');
    if (btn) btn.addEventListener('click', saveJournalEntry);
});

async function saveSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    const newPassword = document.getElementById('settings-password').value;

    // Add loading state
    if (saveBtn) {
        saveBtn.classList.add('btn--loading');
        saveBtn.disabled = true;
    }

    const data = {
        first_name: document.getElementById('settings-name').value,
        birth_date: document.getElementById('settings-birthdate').value,
        birth_time: document.getElementById('settings-birthtime').value,
        birth_place: document.getElementById('settings-birthplace').value
    };

    if (newPassword) {
        // Change password separately
        try {
            const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.Auth?.token}`
                },
                body: JSON.stringify({ password: newPassword })
            });
            if (!res.ok) throw new Error('Password update failed');
        } catch (e) {
            console.error(e);
            window.Auth?.showToast?.('Chyba hesla', 'Heslo se nepodařilo změnit (min. 6 znaků).', 'error');
            // Re-enable button and return on password error
            if (saveBtn) {
                saveBtn.classList.remove('btn--loading');
                saveBtn.disabled = false;
            }
            return;
        }
    }

    try {
        const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.Auth?.token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const updatedUser = await res.json();
            // Update local storage
            const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
            const newUser = { ...currentUser, ...updatedUser.user };
            localStorage.setItem('auth_user', JSON.stringify(newUser));
            window.Auth.user = newUser; // Update in memory

            window.Auth?.showToast?.('Uloženo', 'Profil byl úspěšně aktualizován.', 'success');

            // Re-init biorhythms if date changed
            if (data.birth_date) {
                initBiorhythms(data.birth_date);
            }

            // Reload page to refresh Auth user data (simplest way to sync)
            setTimeout(() => location.reload(), 1500);
        } else {
            throw new Error('Update failed');
        }
    } catch (e) {
        console.error(e);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se uložit nastavení.', 'error');
    } finally {
        // Remove loading state
        if (saveBtn) {
            saveBtn.classList.remove('btn--loading');
            saveBtn.disabled = false;
        }
    }
}

// ==========================================
// BIORHYTHMS LOGIC
// ==========================================
function initBiorhythms(birthDate) {
    const container = document.getElementById('biorhythm-container');
    if (!container || !birthDate) {
        if (container) container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    try {
        // Calculate days since birth
        const birth = new Date(birthDate);
        const today = new Date();
        const daysSinceBirth = Math.floor((today - birth) / (1000 * 60 * 60 * 24));

        // Generate chart data for ±15 days
        const labels = [];
        const physical = [];
        const emotional = [];
        const intellectual = [];

        for (let i = -15; i <= 15; i++) {
            const days = daysSinceBirth + i;
            if (i === 0) {
                labels.push('Dnes');
            } else {
                const date = new Date(today);
                date.setDate(date.getDate() + i);
                labels.push(`${date.getDate()}.${date.getMonth() + 1}.`);
            }

            // Biorhythm formulas (23, 28, 33 day cycles)
            physical.push(Math.sin(2 * Math.PI * days / 23) * 100);
            emotional.push(Math.sin(2 * Math.PI * days / 28) * 100);
            intellectual.push(Math.sin(2 * Math.PI * days / 33) * 100);
        }

        // Render Chart.js
        const canvas = document.getElementById('bio-canvas');
        const ctx = canvas.getContext('2d');

        // Destroy previous chart if exists
        if (window.biorhythmChart) {
            window.biorhythmChart.destroy();
        }

        window.biorhythmChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '💪 Fyzický',
                        data: physical,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '❤️ Emocionální',
                        data: emotional,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '🧠 Intelektuální',
                        data: intellectual,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#fff',
                            font: { size: 11 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#d4af37',
                        bodyColor: '#fff',
                        borderColor: 'rgba(212, 175, 55, 0.3)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        min: -100,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: { size: 10 },
                            callback: function (value) {
                                if (value === 0) return '0';
                                if (value === 100) return '+100';
                                if (value === -100) return '-100';
                                return '';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: { size: 9 },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        // Add summary text
        const summaryDiv = document.getElementById('bio-summary');
        if (summaryDiv) {
            const todayPhysical = physical[15];
            const todayEmotional = emotional[15];
            const todayIntellectual = intellectual[15];

            const getLevel = (value) => {
                if (value > 50) return '🔥 Vysoká';
                if (value > 0) return '✅ Dobrá';
                if (value > -50) return '⚠️ Nízká';
                return '❌ Kritická';
            };

            summaryDiv.innerHTML = `
                <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.85rem;">
                    <p style="margin: 0.25rem 0; opacity: 0.8;"><strong>Dnes:</strong></p>
                    <p style="margin: 0.25rem 0;">💪 Fyzicky: ${getLevel(todayPhysical)}</p>
                    <p style="margin: 0.25rem 0;">❤️ Emoce: ${getLevel(todayEmotional)}</p>
                    <p style="margin: 0.25rem 0;">🧠 Intelekt: ${getLevel(todayIntellectual)}</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error initializing biorhythms:', error);
        container.innerHTML = `
            <p style="text-align: center; opacity: 0.6; padding: 2rem;">
                Nepodařilo se načíst biorytmy. Ujistěte se, že máte vyplněné datum narození.
            </p>
        `;
    }
}

// ==========================================
// MANIFESTATION JOURNAL LOGIC
// ==========================================
async function loadJournal() {
    const list = document.getElementById('journal-entries');
    if (!list) return;

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings`, {
            headers: { 'Authorization': `Bearer ${window.Auth?.token}` }
        });
        const data = await response.json();
        const entries = (data.readings || []).filter(r => r.type === 'journal');

        if (entries.length === 0) {
            list.innerHTML = `<p style="opacity: 0.5; text-align: center;">Zatím žádné záznamy. Napište své první přání...</p>`;
            return;
        }

        list.innerHTML = entries.map(e => `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 3px solid var(--color-mystic-gold);">
                <p style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.3rem;">${new Date(e.created_at).toLocaleDateString()}</p>
                <p style="font-style: italic;">"${escapeHtml(e.data.text)}"</p>
            </div>
        `).join('');

    } catch (e) {
        console.error('Journal load error', e);
    }
}

async function saveJournalEntry() {
    const input = document.getElementById('journal-input');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    const btn = document.getElementById('journal-submit');

    if (btn) {
        btn.innerHTML = '✨ Odesílání...';
        btn.disabled = true;
    }

    // Animation Effect
    input.style.transition = 'all 1s';
    input.style.transform = 'scale(0.95)';
    input.style.opacity = '0.5';

    try {
        const savedEntry = await window.Auth.saveReading('journal', { text });

        if (!savedEntry) throw new Error('Failed to save');

        if (window.Auth && window.Auth.showToast) {
            window.Auth.showToast('Odesláno', 'Vaše přání bylo vysláno do Vesmíru ✨', 'success');
        }

        // Optimistic UI Update (Immediate Feedback)
        const list = document.getElementById('journal-entries');
        if (list) {
            const emptyState = list.querySelector('p');
            if (emptyState && emptyState.textContent.includes('Zatím žádné záznamy')) {
                list.innerHTML = '';
            }

            const newEntryHtml = `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 3px solid var(--color-mystic-gold); animation: fadeIn 0.5s;">
                <p style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.3rem;">${new Date().toLocaleDateString('cs-CZ')}</p>
                <p style="font-style: italic;">"${escapeHtml(text)}"</p>
            </div>
            `;
            list.insertAdjacentHTML('afterbegin', newEntryHtml);
        }

        input.value = '';
        input.style.transform = 'scale(1)';
        input.style.opacity = '1';

        // Background refresh to be sure
        setTimeout(loadJournal, 1000);

    } catch (e) {
        console.error(e);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se uložit záznam.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = '✨ Vyslat přání';
            btn.disabled = false;
        }
    }
}

// Bind Journal Button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('journal-submit');
    if (btn) btn.addEventListener('click', saveJournalEntry);
});
