/**
 * Favorites tab functionality
 */

import { escapeHtml, apiUrl, authHeaders, getReadingIcon, getReadingTitle } from './shared.js';

function renderEmptyFavorites(readingCount = 0) {
    const hasReadings = readingCount > 0;

    return `
        <div class="empty-state">
            <div class="empty-state__icon">⭐</div>
            <h4 class="empty-state__title">${hasReadings ? 'Vyber si první výklad pro návrat' : 'Oblíbené zatím čekají na první návrat'}</h4>
            <p class="empty-state__text">${hasReadings
        ? 'Najdi v historii výklad, ke kterému se chceš vrátit. Hvězda z něj udělá krátký seznam témat, která se opakují.'
        : 'Začni jedním výkladem. Oblíbené pak nejsou sbírka hvězdiček, ale místo pro odpovědi, které mají zůstat po ruce.'}</p>
            <div class="empty-state__actions">
                ${hasReadings
        ? '<button type="button" class="btn btn--primary btn--sm" data-profile-tab-target="history">Otevřít historii</button>'
        : '<a href="tarot.html?source=profile_favorites_empty&feature=tarot" class="btn btn--primary btn--sm">🃏 Tarot</a><a href="horoskopy.html?source=profile_favorites_empty&feature=daily_guidance" class="btn btn--glass btn--sm">⭐ Denní horoskop</a>'}
            </div>
        </div>
    `;
}

export async function loadFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    container.innerHTML = '<p class="profile-loading">Načítání...</p>';

    try {
        const response = await fetch(`${apiUrl()}/user/readings`, {
            credentials: 'include',
            headers: authHeaders()
        });

        if (!response.ok) throw new Error('Failed to load readings');

        const data = await response.json();
        const readings = data.readings || [];
        const favorites = readings.filter(r => r.is_favorite);

        if (favorites.length === 0) {
            container.innerHTML = renderEmptyFavorites(readings.length);
            return;
        }

        container.innerHTML = favorites.map(reading => `
            <div class="reading-item card" data-reading-id="${escapeHtml(reading.id)}" role="button" tabindex="0">
                <div class="reading-item__inner">
                    <div class="reading-item__left">
                        <span class="reading-item__icon" aria-hidden="true">${getReadingIcon(reading.type)}</span>
                        <div>
                            <strong>${escapeHtml(getReadingTitle(reading.type))}</strong>
                            <p class="reading-item__date">
                                ${new Date(reading.created_at).toLocaleDateString('cs-CZ', {
            day: 'numeric', month: 'long', year: 'numeric'
        })}
                            </p>
                        </div>
                    </div>
                    <div class="reading-item__actions">
                        <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${escapeHtml(reading.id)}" title="Odebrat z oblíbených" aria-label="Odebrat z oblíbených">⭐</button>
                        <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${escapeHtml(reading.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">⚠️</div>
                <p class="empty-state__text">Nepodařilo se načíst oblíbené.</p>
            </div>
        `;
    }
}
