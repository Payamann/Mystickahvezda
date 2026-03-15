/**
 * Settings: Avatar picker and subscription management
 */

import { apiUrl, authHeaders } from './shared.js';

// ==========================================
// AVATAR PICKER
// ==========================================

export function toggleAvatarPicker() {
    const picker = document.getElementById('avatar-picker');
    if (!picker) return;
    const isHidden = picker.style.display === 'none' || !picker.style.display;
    picker.style.display = isHidden ? 'block' : 'none';

    // Highlight current avatar
    if (isHidden) {
        const currentAvatar = document.getElementById('user-avatar')?.textContent?.trim();
        picker.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.toggle('avatar-option--active', opt.dataset.avatar === currentAvatar);
        });
    }
}

export async function selectAvatar(emoji) {
    const avatarEl = document.getElementById('user-avatar');
    const picker = document.getElementById('avatar-picker');

    // Optimistic UI update
    if (avatarEl) avatarEl.textContent = emoji;
    if (picker) picker.style.display = 'none';

    // Highlight selected
    picker?.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('avatar-option--active', opt.dataset.avatar === emoji);
    });

    try {
        const res = await fetch(`${apiUrl()}/auth/profile`, {
            method: 'PUT',
            headers: authHeaders(true),
            body: JSON.stringify({ avatar: emoji })
        });

        if (res.ok) {
            // Update local storage
            let currentUser = {};
            try { currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch (e) { /* */ }
            currentUser.avatar = emoji;
            localStorage.setItem('auth_user', JSON.stringify(currentUser));
            if (window.Auth) window.Auth.user = currentUser;
            window.Auth?.showToast?.('Avatar změněn', `Váš nový avatar: ${emoji}`, 'success');
        } else {
            throw new Error('Failed to save avatar');
        }
    } catch (e) {
        console.error('Error saving avatar:', e);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se uložit avatar.', 'error');
    }
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

export async function loadSubscriptionStatus() {
    const container = document.getElementById('subscription-details');
    if (!container) return;

    try {
        const res = await fetch(`${apiUrl()}/payment/subscription/status`, {
            headers: authHeaders()
        });

        if (!res.ok) throw new Error('Failed to load subscription');

        const data = await res.json();
        renderSubscriptionCard(data);

    } catch (e) {
        console.error('Subscription status error:', e);
        container.innerHTML = `
            <div class="subscription-info">
                <div class="subscription-plan">
                    <span class="subscription-plan__name">🆓 Poutník (Zdarma)</span>
                </div>
                <div class="subscription-actions">
                    <a href="cenik.html" class="btn btn--gold btn--sm">🚀 Upgradovat</a>
                </div>
            </div>
        `;
    }
}

function renderSubscriptionCard(sub) {
    const container = document.getElementById('subscription-details');
    if (!container) return;

    const planNames = {
        'free': '🆓 Poutník (Zdarma)',
        'premium_monthly': '⭐ Hvězdný Průvodce (Měsíční)',
        'premium_yearly': '💎 Osvícení (Roční)',
        'premium_pro': '🚀 Premium Pro',
        'exclusive_monthly': '✨ Exclusive',
        'vip': '👑 VIP Věštecký Majestát'
    };

    const statusLabels = {
        'active': { text: 'Aktivní', class: 'badge--success' },
        'trialing': { text: 'Zkušební období', class: 'badge--info' },
        'cancel_pending': { text: 'Zrušeno (aktivní do konce období)', class: 'badge--warning' },
        'past_due': { text: 'Platba selhala', class: 'badge--danger' },
        'cancelled': { text: 'Zrušeno', class: 'badge--danger' }
    };

    const planName = planNames[sub.planType] || sub.planType || 'Zdarma';
    const statusInfo = statusLabels[sub.status] || { text: sub.status, class: '' };
    const isPremium = sub.planType !== 'free';
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    const periodEndStr = periodEnd ? periodEnd.toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : null;

    let html = `<div class="subscription-info">`;

    // Plan name and status
    html += `
        <div class="subscription-plan">
            <span class="subscription-plan__name">${planName}</span>
            <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
        </div>
    `;

    // Period end
    if (isPremium && periodEndStr) {
        const label = sub.status === 'cancel_pending'
            ? 'Přístup končí'
            : 'Další platba';
        html += `<p class="subscription-period">${label}: <strong>${periodEndStr}</strong></p>`;
    }

    // Actions
    html += `<div class="subscription-actions">`;

    if (!isPremium) {
        html += `<a href="cenik.html" class="btn btn--gold btn--sm">🚀 Upgradovat na Premium</a>`;
    } else {
        if (sub.canCancel && sub.status !== 'cancel_pending') {
            html += `<button id="sub-cancel-btn" class="btn btn--sm btn--glass">Zrušit předplatné</button>`;
        }
        if (sub.status === 'cancel_pending') {
            html += `<button id="sub-reactivate-btn" class="btn btn--sm btn--primary">Obnovit předplatné</button>`;
        }
        html += `<button id="sub-portal-btn" class="btn btn--sm btn--glass">Správa plateb</button>`;
    }

    html += `</div></div>`;

    container.innerHTML = html;

    // Bind subscription action buttons
    document.getElementById('sub-cancel-btn')?.addEventListener('click', cancelSubscription);
    document.getElementById('sub-reactivate-btn')?.addEventListener('click', reactivateSubscription);
    document.getElementById('sub-portal-btn')?.addEventListener('click', openStripePortal);
}

async function cancelSubscription() {
    if (!confirm('Opravdu chcete zrušit předplatné? Přístup budete mít do konce aktuálního období.')) {
        return;
    }

    const btn = document.getElementById('sub-cancel-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Ruším...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/cancel`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancel failed');

        window.Auth?.showToast?.('Zrušeno', data.message || 'Předplatné bude zrušeno na konci období.', 'success');
        await loadSubscriptionStatus();

    } catch (e) {
        console.error('Cancel error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se zrušit předplatné.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Zrušit předplatné'; }
    }
}

async function reactivateSubscription() {
    const btn = document.getElementById('sub-reactivate-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Obnovuji...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/reactivate`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reactivate failed');

        window.Auth?.showToast?.('Obnoveno', data.message || 'Předplatné bylo obnoveno.', 'success');
        await loadSubscriptionStatus();

    } catch (e) {
        console.error('Reactivate error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se obnovit předplatné.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Obnovit předplatné'; }
    }
}

async function openStripePortal() {
    const btn = document.getElementById('sub-portal-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Otevírám...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/portal`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Portal failed');

        if (data.url) {
            window.location.href = data.url;
        }

    } catch (e) {
        console.error('Portal error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se otevřít správu plateb.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Správa plateb'; }
    }
}
