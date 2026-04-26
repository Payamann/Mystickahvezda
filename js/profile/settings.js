/**
 * Settings: Avatar picker, subscription management, profile & password update
 */

import { apiUrl, authHeaders, loadPlanManifest, normalizePlanType, formatPlanLabel } from './shared.js';

function startProfileUpgradeCheckout(source = 'profile_subscription_card') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'subscription_management'
    });

    window.Auth?.startPlanCheckout?.('pruvodce', {
        source,
        feature: 'subscription_management',
        redirect: '/cenik.html',
        authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
    });
}

export function initSettingsForm() {
    const user = window.Auth?.user;
    if (!user) return;

    const nameEl = document.getElementById('settings-name');
    const emailEl = document.getElementById('settings-email');
    const birthtimeEl = document.getElementById('settings-birthtime');
    const birthplaceEl = document.getElementById('settings-birthplace');

    if (nameEl) nameEl.value = user.first_name || '';
    if (emailEl) emailEl.value = user.email || '';
    if (birthtimeEl) birthtimeEl.value = user.birth_time || '';
    if (birthplaceEl) birthplaceEl.value = user.birth_place || '';
}

export async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Ukládám...';
    }

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const name = document.getElementById('settings-name')?.value.trim();
        const birthtime = document.getElementById('settings-birthtime')?.value;
        const birthplace = document.getElementById('settings-birthplace')?.value.trim();
        const currentPassword = document.getElementById('settings-current-password')?.value;
        const newPassword = document.getElementById('settings-password')?.value;
        const confirmPassword = document.getElementById('settings-password-confirm')?.value;

        const profileBody = {};
        if (name !== undefined) profileBody.first_name = name;
        if (birthtime) profileBody.birth_time = birthtime;
        if (birthplace !== undefined) profileBody.birth_place = birthplace;

        const profileRes = await fetch(`${apiUrl()}/auth/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                ...authHeaders(true),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify(profileBody)
        });

        if (!profileRes.ok) {
            const err = await profileRes.json().catch(() => ({}));
            throw new Error(err.error || 'Nepodařilo se uložit profil.');
        }

        const profileData = await profileRes.json();

        let cached = {};
        try {
            cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
        } catch (e) {
            cached = {};
        }

        Object.assign(cached, profileData.user || profileBody);
        localStorage.setItem('auth_user', JSON.stringify(cached));
        if (window.Auth) window.Auth.user = cached;

        if (newPassword) {
            if (!currentPassword) {
                throw new Error('Zadejte prosím aktuální heslo.');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('Nová hesla se neshodují.');
            }

            const pwRes = await fetch(`${apiUrl()}/user/password`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    ...authHeaders(true),
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                },
                body: JSON.stringify({
                    currentPassword,
                    password: newPassword,
                    password_confirm: confirmPassword
                })
            });

            if (!pwRes.ok) {
                const err = await pwRes.json().catch(() => ({}));
                throw new Error(err.error || 'Nepodařilo se změnit heslo.');
            }

            ['settings-current-password', 'settings-password', 'settings-password-confirm'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            window.Auth?.showToast?.('Heslo změněno', 'Heslo bylo úspěšně změněno. Za chvíli vás odhlásíme.', 'success');
            setTimeout(() => window.Auth?.logout?.(), 2000);
            return;
        }

        window.Auth?.showToast?.('Uloženo', 'Nastavení bylo úspěšně uloženo.', 'success');
    } catch (e) {
        console.error('Settings save error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se uložit nastavení.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Uložit změny';
        }
    }
}

export function toggleAvatarPicker() {
    const picker = document.getElementById('avatar-picker');
    if (!picker) return;
    const isHidden = picker.hidden || !picker.classList.contains('profile-block-visible');
    picker.hidden = !isHidden;
    picker.classList.toggle('profile-block-visible', isHidden);

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

    if (avatarEl) avatarEl.textContent = emoji;
    if (picker) {
        picker.hidden = true;
        picker.classList.remove('profile-block-visible');
    }

    picker?.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('avatar-option--active', opt.dataset.avatar === emoji);
    });

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${apiUrl()}/auth/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                ...authHeaders(true),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({ avatar: emoji })
        });

        if (!res.ok) {
            throw new Error('Nepodařilo se uložit avatar.');
        }

        let currentUser = {};
        try {
            currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
        } catch (e) {
            currentUser = {};
        }

        currentUser.avatar = emoji;
        localStorage.setItem('auth_user', JSON.stringify(currentUser));
        if (window.Auth) window.Auth.user = currentUser;
        window.Auth?.showToast?.('Avatar změněn', `Nový avatar: ${emoji}`, 'success');
    } catch (e) {
        console.error('Error saving avatar:', e);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se uložit avatar.', 'error');
    }
}

export async function loadSubscriptionStatus() {
    const container = document.getElementById('subscription-details');
    if (!container) return null;

    try {
        await loadPlanManifest();

        const res = await fetch(`${apiUrl()}/payment/subscription/status`, {
            credentials: 'include',
            headers: authHeaders()
        });

        if (!res.ok) throw new Error('Failed to load subscription');

        const data = await res.json();
        renderSubscriptionCard(data);
        return data;
    } catch (e) {
        console.error('Subscription status error:', e);
        container.innerHTML = `
            <div class="subscription-info">
                <div class="subscription-plan">
                    <span class="subscription-plan__name">Poutník (zdarma)</span>
                </div>
                <div class="subscription-actions">
                    <button id="sub-upgrade-fallback-btn" type="button" class="btn btn--gold btn--sm">Upgradovat</button>
                </div>
            </div>
        `;
        document.getElementById('sub-upgrade-fallback-btn')?.addEventListener('click', () => {
            startProfileUpgradeCheckout('profile_subscription_fallback');
        });
        return null;
    }
}

function renderSubscriptionCard(sub) {
    const container = document.getElementById('subscription-details');
    if (!container) return;
    const normalizedPlanType = normalizePlanType(sub.planType);

    const statusLabels = {
        active: { text: 'Aktivní', class: 'badge--success' },
        trialing: { text: 'Zkušební období', class: 'badge--info' },
        cancel_pending: { text: 'Zrušeno na konci období', class: 'badge--warning' },
        past_due: { text: 'Platba selhala', class: 'badge--danger' },
        cancelled: { text: 'Zrušeno', class: 'badge--danger' }
    };

    const planName = formatPlanLabel(normalizedPlanType, { freeSuffix: true });
    const statusInfo = statusLabels[sub.status] || { text: sub.status, class: '' };
    const isPremium = normalizedPlanType !== 'free';
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    const periodEndStr = periodEnd ? periodEnd.toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : null;

    let html = '<div class="subscription-info">';
    html += `
        <div class="subscription-plan">
            <span class="subscription-plan__name">${planName}</span>
            <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
        </div>
    `;

    if (sub.status === 'trialing' && periodEnd) {
        const daysRemaining = Math.max(0, Math.ceil((periodEnd - new Date()) / 86400000));
        const dayWord = daysRemaining === 1 ? 'den' : (daysRemaining >= 2 && daysRemaining <= 4) ? 'dny' : 'dni';
        html += `<div class="trial-countdown">
            <span class="trial-countdown__main">Zkušební období: zbývá <strong>${daysRemaining}</strong> ${dayWord}</span>
            <span class="trial-countdown__date">Končí: ${periodEndStr}</span>
        </div>`;
    }

    if (isPremium && periodEndStr) {
        const label = sub.status === 'cancel_pending'
            ? 'Přístup končí'
            : sub.status === 'trialing'
            ? 'Zkušební období končí'
            : 'Další obnova';
        html += `<p class="subscription-period">${label}: <strong>${periodEndStr}</strong></p>`;
    }

    html += '<div class="subscription-actions">';

    if (!isPremium) {
        html += '<button id="sub-upgrade-btn" type="button" class="btn btn--gold btn--sm">Upgradovat na Premium</button>';
    } else {
        if (sub.canCancel && sub.status !== 'cancel_pending') {
            html += '<button id="sub-cancel-btn" class="btn btn--sm btn--glass">Zrušit předplatné</button>';
        }
        if (sub.status === 'cancel_pending') {
            html += '<button id="sub-reactivate-btn" class="btn btn--sm btn--primary">Obnovit předplatné</button>';
        }
        html += '<button id="sub-portal-btn" class="btn btn--sm btn--glass">Správa plateb</button>';
    }

    html += '</div></div>';
    container.innerHTML = html;

    document.getElementById('sub-upgrade-btn')?.addEventListener('click', () => {
        startProfileUpgradeCheckout('profile_subscription_card');
    });
    document.getElementById('sub-cancel-btn')?.addEventListener('click', cancelSubscription);
    document.getElementById('sub-reactivate-btn')?.addEventListener('click', reactivateSubscription);
    document.getElementById('sub-portal-btn')?.addEventListener('click', openStripePortal);
}

async function cancelSubscription({ skipRetention = false } = {}) {
    if (!skipRetention && window.MH_RETENTION?.showCancellationModal) {
        window.MH_ANALYTICS?.trackSubscriptionAction?.('cancel_flow_opened', {
            source: 'profile_settings'
        });
        window.MH_RETENTION.showCancellationModal(() => cancelSubscription({ skipRetention: true }));
        return;
    }

    if (!skipRetention) {
        const confirmed = confirm('Opravdu chcete zrušit předplatné? Přístup vám zůstane do konce aktuálního období.');
        if (!confirmed) {
            return;
        }
    }

    const btn = document.getElementById('sub-cancel-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Ruším...';
    }

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${apiUrl()}/payment/cancel`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...authHeaders(true),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancel failed');
        window.MH_ANALYTICS?.trackSubscriptionAction?.('cancel_requested', { source: 'profile_settings', plan_type: 'premium' });

        window.Auth?.showToast?.('Zrušeno', data.message || 'Předplatné bude ukončeno na konci období.', 'success');
        await loadSubscriptionStatus();
    } catch (e) {
        console.error('Cancel error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se zrušit předplatné.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Zrušit předplatné';
        }
    }
}

async function reactivateSubscription() {
    const btn = document.getElementById('sub-reactivate-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Obnovuji...';
    }

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${apiUrl()}/payment/reactivate`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...authHeaders(true),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reactivate failed');
        window.MH_ANALYTICS?.trackSubscriptionAction?.('reactivated', { source: 'profile_settings' });

        window.Auth?.showToast?.('Obnoveno', data.message || 'Předplatné bylo obnoveno.', 'success');
        await loadSubscriptionStatus();
    } catch (e) {
        console.error('Reactivate error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se obnovit předplatné.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Obnovit předplatné';
        }
    }
}

async function openStripePortal() {
    const btn = document.getElementById('sub-portal-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Otevírám...';
    }

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${apiUrl()}/payment/portal`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...authHeaders(true),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Portal failed');

        if (data.url) {
            window.MH_ANALYTICS?.trackBillingPortalOpened?.({ source: 'profile_settings' });
            window.location.href = data.url;
        }
    } catch (e) {
        console.error('Portal error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se otevřít správu plateb.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Správa plateb';
        }
    }
}
