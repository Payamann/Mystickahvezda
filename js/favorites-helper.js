/**
 * Toggle favorite status for a reading
 * @param {string} readingId - The ID of the reading
 * @param {string} buttonId - The ID of the button element
 */
async function toggleFavorite(readingId, buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn || !readingId) return;

    try {
        const response = await fetch(`/api/user/readings/${readingId}/favorite`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to toggle favorite');

        const data = await response.json();
        const isFavorite = data.is_favorite;

        // Update button
        const icon = btn.querySelector('.favorite-icon');
        if (isFavorite) {
            icon.textContent = '⭐';
            btn.innerHTML = `<span class="favorite-icon">⭐</span> Oblíbené`;
            btn.classList.remove('btn--glass');
            btn.classList.add('btn--primary');
        } else {
            icon.textContent = '☆';
            btn.innerHTML = `<span class="favorite-icon">☆</span> Přidat do oblíbených`;
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--glass');
        }

        // Toast notification
        if (window.showToast) {
            window.showToast(isFavorite ? '⭐ Přidáno do oblíbených' : 'Odebráno z oblíbených');
        }

    } catch (error) {
        console.error('Error toggling favorite:', error);
        if (window.showToast) {
            window.showToast('❌ Nepodařilo se uložit', 'error');
        }
    }
}

// Expose globally for use across reading pages
window.toggleFavorite = toggleFavorite;
