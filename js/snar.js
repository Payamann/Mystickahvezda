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
            const response = await fetch('data/dreams.json');
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
        btnAll.style.width = 'auto';
        btnAll.style.padding = '0 10px';
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
            loadMoreWrapper.style.gridColumn = '1 / -1';
            loadMoreWrapper.style.textAlign = 'center';
            loadMoreWrapper.style.marginTop = '2rem';
            
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn btn--secondary';
            loadMoreBtn.textContent = 'Načíst další symboly';
            loadMoreBtn.style.padding = '12px 30px';
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
        // Reset limit when changing filter
        currentlyVisibleCount = INITIAL_VISIBLE_COUNT;

        document.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('active'));
        if (btnTarget) {
            btnTarget.classList.add('active');
        } else {
            alphabetNav.firstChild.classList.add('active'); // "Vše"
        }

        searchInput.value = ''; // clear search if using letters

        if (!letter) {
            filteredData = dreamsData;
            renderDictionary(true); // Use limit for "All"
            return;
        }

        filteredData = dreamsData.filter(d => d.keyword.toUpperCase().startsWith(letter));
        renderDictionary(false); // Show all results for specific letter
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
                alphabetNav.firstChild.classList.add('active');
                return;
            }

            filteredData = dreamsData.filter(d =>
                d.keyword.toLowerCase().includes(query) ||
                d.description.toLowerCase().includes(query)
            );
            renderDictionary(false); // Show all results for search
        }, 200);
    });

    // 5. Popular Cards Handling
    function initPopularCards() {
        document.querySelectorAll('.popular-card[data-search]').forEach(card => {
            card.onclick = (e) => {
                e.preventDefault();
                const term = card.getAttribute('data-search');
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
                    renderDictionary(false); // Show all results for the specific term

                    // Scroll to search area or grid
                    const target = document.querySelector('.dream-search-wrapper') || dictGrid;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        });
    }

    // INITIALIZE
    await loadDreamData();
    initPopularCards();
});
