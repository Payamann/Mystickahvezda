// snar.js - Logic for Dream Lexicon

document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('dream-search');
    const alphabetNav = document.getElementById('alphabet-nav');
    const dictGrid = document.getElementById('dict-grid');
    
    // Constants for performance
    const INITIAL_VISIBLE_COUNT = 24;
    let currentlyVisibleCount = INITIAL_VISIBLE_COUNT;
    let dreamsData = [];
    let filteredData = [];

    // --- DICTIONARY LOGIC ---

    // 1. Fetch JSON Data
    async function loadDreamData() {
        try {
            const response = await fetch('/data/dreams.json');
            if (!response.ok) throw new Error('Data se nepodařilo načíst');
            dreamsData = await response.json();

            // Sort alphabetically by keyword
            dreamsData.sort((a, b) => a.keyword.localeCompare(b.keyword, 'cs'));

            // Expose globally so Symbol dne (inline script) can access the data
            window.globalDreamsData = dreamsData;
            filteredData = dreamsData;

            initAlphabet();
            renderDictionary(true); // Initial load with limit
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
        btnAll.classList.add('alphabet-btn--all');
        btnAll.addEventListener('click', () => filterByLetter(null));
        alphabetNav.appendChild(btnAll);

        letters.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'alphabet-btn';
            btn.textContent = letter;
            btn.addEventListener('click', (e) => filterByLetter(letter, e.target));
            alphabetNav.appendChild(btn);
        });
    }

    // 3. Render Grid
    function renderDictionary(useLimit = false) {
        const dataToShow = filteredData;
        const totalCount = dataToShow.length;
        
        if (totalCount === 0) {
            dictGrid.innerHTML = '<div class="no-results">Tento symbol ve hvězdných spisech zatím nevidíme.</div>';
            return;
        }

        const itemsToRender = useLimit ? dataToShow.slice(0, currentlyVisibleCount) : dataToShow;
        
        dictGrid.innerHTML = '';
        itemsToRender.forEach(item => {
            const card = document.createElement('article');
            card.className = 'dict-card';
            card.id = 'symbol-' + item.id;
            const emojiStr = item.emoji ? `${item.emoji} ` : '';
            card.innerHTML = `<h3 class="dict-keyword">${emojiStr}${item.keyword}</h3>
                              <p class="dict-desc">${item.description}</p>`;
            dictGrid.appendChild(card);
        });

        // Add "Load More" button if needed
        if (useLimit && totalCount > currentlyVisibleCount) {
            const loadMoreWrapper = document.createElement('div');
            loadMoreWrapper.className = 'load-more-wrapper';
            
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn btn--secondary';
            loadMoreBtn.textContent = 'Načíst další symboly';
            loadMoreBtn.classList.add('load-more-button');
            loadMoreBtn.addEventListener('click', () => {
                currentlyVisibleCount += 24;
                renderDictionary(true);
            });
            
            loadMoreWrapper.appendChild(loadMoreBtn);
            dictGrid.appendChild(loadMoreWrapper);
        }
    }

    // 4. Filtering
    function filterByLetter(letter, btnTarget = null) {
        if (window.MH_DEBUG) console.debug('[snar.js] Filtering by letter:', letter);
        // Reset limit when changing filter
        currentlyVisibleCount = INITIAL_VISIBLE_COUNT;

        document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));
        if (btnTarget) {
            btnTarget.classList.add('active');
        } else if (alphabetNav.firstChild) {
            alphabetNav.firstChild.classList.add('active'); // "Vše"
        }

        searchInput.value = ''; // clear search if using letters

        if (!letter) {
            filteredData = dreamsData;
            renderDictionary(true); 
            return;
        }

        // Accent-insensitive matching for the first letter
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const searchLetter = normalize(letter);
        
        filteredData = dreamsData.filter(d => {
            if (!d.keyword) return false;
            return normalize(d.keyword.charAt(0)) === searchLetter;
        });
        
        renderDictionary(false); 
    }

    let searchDebounceTimer = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            currentlyVisibleCount = INITIAL_VISIBLE_COUNT;

            document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));

            if (!query) {
                filteredData = dreamsData;
                renderDictionary(true);
                if (alphabetNav.firstChild) alphabetNav.firstChild.classList.add('active');
                return;
            }

            filteredData = dreamsData.filter(d =>
                d.keyword.toLowerCase().includes(query) ||
                d.description.toLowerCase().includes(query)
            );
            renderDictionary(false); 
        }, 200);
    });

    // 5. Popular Cards Handling
    function initPopularCards() {
        document.querySelectorAll('.popular-card[data-search]').forEach(card => {
            card.onclick = (e) => {
                e.preventDefault();
                const term = card.getAttribute('data-search');
                if (window.MH_DEBUG) console.debug('[snar.js] Popular card clicked:', term);
                if (term) {
                    searchInput.value = term;
                    // Reset letters
                    document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));
                    
                    // Filter and render
                    const query = term.toLowerCase().trim();
                    filteredData = dreamsData.filter(d => 
                        d.keyword.toLowerCase().includes(query) || 
                        d.description.toLowerCase().includes(query)
                    );
                    renderDictionary(false); 

                    // Scroll to search area or grid
                    const target = document.querySelector('.search-section') || dictGrid;
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            };
        });
    }

    // INITIALIZE
    await loadDreamData();
    initPopularCards();
});
