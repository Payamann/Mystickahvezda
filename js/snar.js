// snar.js - Logic for Dream Lexicon

document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('dream-search');
    const alphabetNav = document.getElementById('alphabet-nav');
    const dictGrid = document.getElementById('dict-grid');

    const aiTextarea = document.getElementById('ai-dream-input');
    const btnAnalyze = document.getElementById('btn-analyze-dream');
    const aiLoading = document.getElementById('ai-loading');
    const aiResult = document.getElementById('ai-result');

    let dreamsData = [];

    // --- DICTIONARY LOGIC ---

    // 1. Fetch JSON Data
    async function loadDreamData() {
        try {
            const response = await fetch('data/dreams.json');
            if (!response.ok) throw new Error('Data se nepodařilo načíst');
            dreamsData = await response.json();

            // Sort alphabetically by keyword
            dreamsData.sort((a, b) => a.keyword.localeCompare(b.keyword, 'cs'));

            // Expose globally so Symbol dne (inline script) can access the data
            window.globalDreamsData = dreamsData;

            initAlphabet();
            renderDictionary(dreamsData);
        } catch (error) {
            console.error('Error loading dream data:', error);
            dictGrid.innerHTML = '<div class="no-results">Svazek snů se ztratil v mlze. Zkuste obnovit stránku.</div>';
        }
    }

    // 2. Init Alphabet Navigation
    function initAlphabet() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

        // "Vše" button
        const btnAll = document.createElement('button');
        btnAll.className = 'alphabet-btn active';
        btnAll.textContent = 'Vše';
        btnAll.style.width = 'auto';
        btnAll.style.padding = '0 10px';
        btnAll.addEventListener('click', () => filterByLetter(null));
        alphabetNav.appendChild(btnAll);

        letters.forEach(letter => {
            // Only add button if there is at least one word starting with this letter (optional)
            // Or just add all
            const btn = document.createElement('button');
            btn.className = 'alphabet-btn';
            btn.textContent = letter;
            btn.addEventListener('click', (e) => filterByLetter(letter, e.target));
            alphabetNav.appendChild(btn);
        });
    }

    // 3. Render Grid
    function renderDictionary(dataToShow) {
        if (dataToShow.length === 0) {
            dictGrid.innerHTML = '<div class="no-results">Tento symbol ve hvězdných spisech zatím nevidíme. Zkuste si nechat sen rozebrat Průvodcem nahoře!</div>';
            return;
        }

        dictGrid.innerHTML = '';
        dataToShow.forEach(item => {
            const card = document.createElement('article');
            card.className = 'dict-card';
            card.id = 'symbol-' + item.id;
            card.innerHTML = `<h3 class="dict-keyword">${emojiHtml}${item.keyword}</h3>
                              <p class="dict-desc">${item.description}</p>
                              <a href="#" onclick="document.querySelector('.ai-dream-section').scrollIntoView({behavior: 'smooth'}); document.getElementById('ai-dream-input').focus(); return false;" style="display:inline-block; margin-top:12px; font-size:0.85rem; color: var(--color-mystic-gold); text-decoration: none; border: 1px solid rgba(212, 175, 55, 0.3); padding: 5px 10px; border-radius: 20px; transition: background 0.2s;">✨ Hluboký osobní výklad (Premium)</a>`;
            dictGrid.appendChild(card);
        });
    }

    // 4. Filtering
    function filterByLetter(letter, btnTarget = null) {
        // Handle active classes
        document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));
        if (btnTarget) {
            btnTarget.classList.add('active');
        } else {
            alphabetNav.firstChild.classList.add('active'); // "Vše"
        }

        searchInput.value = ''; // clear search if using letters

        if (!letter) {
            renderDictionary(dreamsData);
            return;
        }

        const filtered = dreamsData.filter(d => d.keyword.toUpperCase().startsWith(letter));
        renderDictionary(filtered);
    }

    let searchDebounceTimer = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();

            // Remove active state from letters when searching manually
            document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));

            if (!query) {
                renderDictionary(dreamsData);
                alphabetNav.firstChild.classList.add('active');
                return;
            }

            const filtered = dreamsData.filter(d =>
                d.keyword.toLowerCase().includes(query) ||
                d.description.toLowerCase().includes(query)
            );
            renderDictionary(filtered);
        }, 200);
    });

    // --- PREMIUM DREAM ANALYSIS ---

    btnAnalyze.addEventListener('click', async () => {
        const dreamText = aiTextarea.value.trim();

        if (!dreamText) {
            window.Auth?.showToast?.('Prosím napište svůj sen do pole výše.', '', 'error');
            return;
        }

        if (dreamText.length < 20) {
            window.Auth?.showToast?.('Sen je příliš krátký na podrobnou analýzu. Přidejte detaily.', '', 'error');
            return;
        }

        // Check auth status
        const isAuth = window.Auth && window.Auth.isLoggedIn();
        if (!isAuth) {
            window.Auth?.showToast?.('Pro hluboký osobní výklad snu musíte být přihlášeni.', '', 'error');
            window.Auth?.openModal?.('login');
            return;
        }

        // Show loading state
        btnAnalyze.disabled = true;
        aiResult.style.display = 'none';
        aiLoading.style.display = 'block';

        // Scroll to loading slightly
        aiLoading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const token = localStorage.getItem('auth_token') || window.Auth?.token;
            const baseUrl = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${baseUrl}/dream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ dream: dreamText })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle premium gate or other errors
                if (data.code === 'PREMIUM_REQUIRED') {
                    window.showPremiumModal('dream_analysis');
                    throw new Error('Premium Required'); // To cleanly exit try block
                }
                throw new Error(data.error || 'Neznámá chyba serveru');
            }

            // Success: Clean up markdown backticks before rendering
            let cleanHtml = data.response;
            if (cleanHtml.includes('```html')) {
                cleanHtml = cleanHtml.replace(/```html/g, '').replace(/```/g, '').trim();
            } else if (cleanHtml.includes('```')) {
                cleanHtml = cleanHtml.replace(/```/g, '').trim();
            }
            aiResult.innerHTML = cleanHtml;
            aiResult.style.display = 'block';

        } catch (error) {
            if (error.message !== 'Premium Required') {
                console.error('Dream analysis error:', error);
                window.Auth?.showToast?.(error.message, '', 'error');
            }
        } finally {
            btnAnalyze.disabled = false;
            aiLoading.style.display = 'none';
        }
    });

    // INITIALIZE
    loadDreamData();
});
