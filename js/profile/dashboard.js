/**
 * Main dashboard controller for Profile page
 */

import { escapeHtml, apiUrl, authHeaders, getReadingIcon, getReadingTitle, getZodiacSign, getZodiacIconName } from './shared.js';
import { loadReadings, showMoreReadings, handleFilterChange, renderReadings } from './readings.js';
import { loadFavorites } from './favorites.js';
import { toggleAvatarPicker, selectAvatar, loadSubscriptionStatus } from './settings.js';
import { viewReading, closeReadingModal, toggleFavoriteModal, deleteReading } from './modal.js';

// Re-export utility functions that were originally in dashboard but fit better here or shared
// For now, we'll implement them here to match the plan

function initTabs() {
    const tabs = document.querySelectorAll('.tab[data-tab], .profile-tab[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            contents.forEach(c => {
                c.style.display = c.id === `tab-${targetId}` ? 'block' : 'none';
            });

            if (targetId === 'favorites') {
                loadFavorites();
            }
        });
    });
}

function handleLogout() {
    if (confirm('Opravdu se chcete odhlásit?')) {
        window.Auth?.logout();
    }
}

function formatPlanLocal(plan) {
    const plans = {
        'free': '🆓 Zdarma',
        'premium_monthly': '⭐ Premium (měsíční)',
        'premium_yearly': '💎 Premium (roční)'
    };
    return plans[plan] || plan || 'Zdarma';
}

// Stats logic
function calculateStreak(readings) {
    if (!readings || !readings.length) return 0;

    const dates = readings.map(r => new Date(r.created_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let streak = 0;
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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = target;
        return;
    }

    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateStats(readings) {
    if (!readings) readings = [];

    const total = readings.length;
    const now = new Date();
    const thisMonth = readings.filter(r => {
        const date = new Date(r.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const favorites = readings.filter(r => r.is_favorite).length;
    const streak = calculateStreak(readings);

    animateCounter('stat-total', total);
    animateCounter('stat-month', thisMonth);
    animateCounter('stat-favorites', favorites);
    animateCounter('stat-streak', streak);
}



// ZODIAC logic moved here as per original file structure
function getZodiacSignLocal(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const signs = [
        { name: 'Kozoroh', symbol: '♑', start: [1, 1], end: [1, 19] },
        { name: 'Vodnář', symbol: '♒', start: [1, 20], end: [2, 18] },
        { name: 'Ryby', symbol: '♓', start: [2, 19], end: [3, 20] },
        { name: 'Beran', symbol: '♈', start: [3, 21], end: [4, 19] },
        { name: 'Býk', symbol: '♉', start: [4, 20], end: [5, 20] },
        { name: 'Blíženci', symbol: '♊', start: [5, 21], end: [6, 20] },
        { name: 'Rak', symbol: '♋', start: [6, 21], end: [7, 22] },
        { name: 'Lev', symbol: '♌', start: [7, 23], end: [8, 22] },
        { name: 'Panna', symbol: '♍', start: [8, 23], end: [9, 22] },
        { name: 'Váhy', symbol: '♎', start: [9, 23], end: [10, 22] },
        { name: 'Štír', symbol: '♏', start: [10, 23], end: [11, 21] },
        { name: 'Střelec', symbol: '♐', start: [11, 22], end: [12, 21] },
        { name: 'Kozoroh', symbol: '♑', start: [12, 22], end: [12, 31] }
    ];

    for (const sign of signs) {
        const [sm, sd] = sign.start;
        const [em, ed] = sign.end;
        if ((month === sm && day >= sd) || (month === em && day <= ed)) {
            return sign;
        }
    }
    return null;
}

function showZodiacSignLocal(birthDate) {
    const zodiacEl = document.getElementById('user-zodiac');
    if (!zodiacEl) return;

    const sign = getZodiacSignLocal(birthDate);
    if (sign) {
        zodiacEl.textContent = `${sign.symbol} ${sign.name}`;
        zodiacEl.style.display = 'block';
    }
}

// MAIN INIT
let listenersAttached = false;

async function initProfile() {
    // Wait for Auth
    let retries = 0;
    while (!window.Auth && retries < 20) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }

    const user = window.Auth?.user;
    const isLoggedIn = window.Auth?.isLoggedIn();

    const loginRequired = document.getElementById('login-required');
    const dashboard = document.getElementById('profile-dashboard');
    const greeting = document.getElementById('profile-greeting');

    if (!isLoggedIn) {
        if (loginRequired) loginRequired.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
        if (greeting) greeting.textContent = 'Přihlaste se pro zobrazení vašeho profilu';

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

    // Login success UI
    if (loginRequired) loginRequired.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    // Populate user info
    if (user) {
        const displayName = user.first_name || user.email.split('@')[0];
        if (greeting) greeting.textContent = `Vítejte zpět, ${displayName}! ✨`;

        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email;

        const plan = user.subscription_status || user.subscriptions?.plan_type || 'free';
        const planLabels = {
            'free': 'Poutník', 'poutnik': 'Poutník', 'hledac': 'Hledač',
            'osviceny': 'Osvícený', 'vip': 'VIP'
        };
        const planClass = (plan !== 'free' && plan !== 'poutnik') ? 'badge--premium' : 'badge--secondary';
        const planLabel = planLabels[plan.split('_')[0]] || 'Poutník';
        // Support both layout variants: wrapper #user-badges or direct #user-plan span
        const badgesContainer = document.getElementById('user-badges');
        if (badgesContainer) {
            badgesContainer.innerHTML = `<span id="user-plan" class="badge ${planClass}">${planLabel}</span>`;
        }
        const planEl = document.getElementById('user-plan');
        if (planEl) {
            planEl.textContent = planLabel;
            planEl.className = `badge ${planClass}`;
        }

        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl && user.avatar) {
            avatarEl.textContent = user.avatar;
        }

        if (user.birth_date) {
            const sign = getZodiacSign(user.birth_date);
            const zodiacEl = document.getElementById('user-zodiac');
            if (zodiacEl && sign) {
                zodiacEl.style.display = 'block';
                zodiacEl.innerHTML = `<i data-lucide="${getZodiacIconName(sign.symbol)}" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i> ${sign.name}`;
            }
        }
    }

    initTabs();

    // Parallel load
    const [readings] = await Promise.all([
        loadReadings(),
        loadSubscriptionStatus()
    ]);

    updateStats(readings);

    // Event Listeners
    if (!listenersAttached) {
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        document.getElementById('readings-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('readings-load-more')?.addEventListener('click', showMoreReadings);

        // Modal listeners
        document.getElementById('reading-modal-close')?.addEventListener('click', closeReadingModal);
        document.getElementById('modal-favorite-btn')?.addEventListener('click', toggleFavoriteModal);
        document.getElementById('modal-delete-btn')?.addEventListener('click', deleteReading);

        document.getElementById('reading-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'reading-modal') closeReadingModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('reading-modal');
                if (modal && modal.style.display !== 'none') closeReadingModal();

                const picker = document.getElementById('avatar-picker');
                if (picker && picker.style.display !== 'none') picker.style.display = 'none';
            }
        });

        document.getElementById('user-avatar')?.addEventListener('click', toggleAvatarPicker);
        document.getElementById('avatar-picker')?.addEventListener('click', (e) => {
            const option = e.target.closest('.avatar-option');
            if (option) selectAvatar(option.dataset.avatar);
        });

        // Journal listeners
        const journalBtn = document.getElementById('journal-submit');
        if (journalBtn) {
            journalBtn.addEventListener('click', async () => {
                const input = document.getElementById('journal-input');
                const text = input?.value.trim();
                if (!text) return;

                // Simple implementation of journal submission
                journalBtn.disabled = true;
                journalBtn.innerHTML = '<span class="loading-spinner--sm"></span> Vysílám...';

                try {
                    const response = await fetch(`${apiUrl()}/user/journal`, {
                        method: 'POST',
                        headers: authHeaders(true),
                        body: JSON.stringify({ entry: text })
                    });
                    
                    if (response.ok) {
                        input.value = '';
                        window.showToast?.('Přání vysláno', 'Vaše slova se nesou ke hvězdám...', 'success');
                        // Trigger stardust effect if exists
                        if (window.createStardust) window.createStardust(journalBtn);
                        // Refresh something? Maybe load readings if they include journal
                        loadReadings();
                    } else {
                        window.showToast?.('Chyba', 'Vesmír momentálně neodpovídá.', 'error');
                    }
                } catch (e) {
                    console.error('Journal error:', e);
                } finally {
                    journalBtn.disabled = false;
                    journalBtn.innerHTML = '✨ Vyslat přání';
                }
            });
        }

        // Listen for updates from other modules
        document.addEventListener('reading:updated', (e) => {
            if (e.detail && e.detail.readings) {
                updateStats(e.detail.readings);
            }
        });

        listenersAttached = true;
    }

    // Always refresh icons after content load
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Magic Stardust Animation
window.createStardust = function(element) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const count = 20;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'stardust-particle';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random starting position within element
        const x = rect.left + Math.random() * rect.width;
        const y = rect.top + Math.random() * rect.height;
        
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Random destination
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200 - 100; // Rise up
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        particle.style.animation = `stardust-fade-out ${Math.random() * 1 + 0.5}s ease-out forwards`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1500);
    }
};

// Make functions available globally for HTML event handlers if needed
// (Though typically we attach listeners in JS)
window.viewReading = viewReading;
window.toggleFavorite = (id, el) => {
    // We need to import toggleFavorite from modal.js but it's not exported there as default
    // and we need to handle the button element context
    import('./modal.js').then(m => m.toggleFavorite(id, el));
};

// Initialize — guard against concurrent calls (auth:changed can fire multiple times)
let _profileInitRunning = false;
async function safeInitProfile() {
    if (_profileInitRunning) return;
    _profileInitRunning = true;
    try { await initProfile(); } finally { _profileInitRunning = false; }
}

document.addEventListener('DOMContentLoaded', () => {
    safeInitProfile();
    document.addEventListener('auth:changed', () => safeInitProfile());
});
