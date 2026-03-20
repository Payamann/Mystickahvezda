    let allNames = {};
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZŠČŘŽ".split('').sort((a,b) => a.localeCompare(b, 'cs'));
    const alphabetBar = document.getElementById('alphabet-bar');
    const searchInput = document.getElementById('name-search');
    const autocompleteDropdown = document.getElementById('autocomplete-results');

    // 1. Initialize
    fetch('../data/jmena.json').then(r=>r.json()).then(data=>{
        allNames = data;
        initAlphabet();
        renderGridByLetter('A');
    });

    // 2. Alphabet Bar
    function initAlphabet() {
        alphabetBar.innerHTML = alphabet.map(l => `<button class="alpha-btn" data-letter="${l}">${l}</button>`).join('');
    }

    // Event delegation for alphabet
    alphabetBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.alpha-btn');
        if (btn) {
            selectLetter(btn.dataset.letter);
        }
    });

    window.selectLetter = function(letter) {
        console.log(`[names] Selected letter: ${letter}`);
        // Reset search field when using alphabet
        searchInput.value = '';
        autocompleteDropdown.style.display = 'none';
        
        document.querySelectorAll('.alpha-btn').forEach(b => b.classList.toggle('active', b.textContent === letter));
        renderGridByLetter(letter);
        
        const grid = document.getElementById('names-grid');
        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderGridByLetter(letter) {
        const grid = document.getElementById('names-grid');
        const filtered = Object.keys(allNames).filter(n => n.startsWith(letter)).sort();
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); grid-column:1/-1; text-align:center;">Žádná jména od tohoto písmene nemáme v databázi.</p>';
            return;
        }

        grid.innerHTML = `<h3 class="letter-header">${letter}</h3>` + 
            filtered.map(n => `
                <div class="name-card" data-name="${n}">
                    <span class="name-label">${n}</span>
                    <span class="name-meta">${allNames[n].origin}</span>
                </div>
            `).join('');
    }

    // Event delegation for grid
    document.getElementById('names-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.name-card');
        if (card) {
            showName(card.dataset.name);
        }
    });

    // 3. Autocomplete / Našeptávač
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val.length < 1) {
            autocompleteDropdown.style.display = 'none';
            return;
        }

        const matches = Object.keys(allNames)
            .filter(n => n.toLowerCase().includes(val))
            .sort((a, b) => {
                // Prioritize names starting with search term
                const aStarts = a.toLowerCase().startsWith(val);
                const bStarts = b.toLowerCase().startsWith(val);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            })
            .slice(0, 8);

        if (matches.length > 0) {
            autocompleteDropdown.innerHTML = matches.map(n => `
                <div class="autocomplete-item" data-name="${n}">
                    <span>${n}</span>
                    <span class="meta">${allNames[n].nameday} | ${allNames[n].origin}</span>
                </div>
            `).join('');
            autocompleteDropdown.style.display = 'block';
        } else {
            autocompleteDropdown.style.display = 'none';
        }
    });

    // Event delegation for autocomplete
    autocompleteDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            selectAutocomplete(item.dataset.name);
        }
    });

    window.selectAutocomplete = function(name) {
        searchInput.value = name;
        autocompleteDropdown.style.display = 'none';
        showName(name);
    }

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.name-search-container')) {
            autocompleteDropdown.style.display = 'none';
        }
    });

    // 4. Searching & Showing
    window.searchName = function() {
        const q = searchInput.value.trim();
        if (!q) return;
        
        const exact = Object.keys(allNames).find(n => n.toLowerCase() === q.toLowerCase());
        if (exact) {
            showName(exact);
            autocompleteDropdown.style.display = 'none';
        } else {
            // If no exact match, show grid filtered by query
            const filtered = Object.keys(allNames).filter(n => n.toLowerCase().includes(q.toLowerCase()));
            const grid = document.getElementById('names-grid');
            if (filtered.length > 0) {
                grid.innerHTML = `<h3 class="letter-header">Výsledky hledání: "${q}"</h3>` + 
                    filtered.map(n => `
                        <div class="name-card" data-name="${n}">
                            <span class="name-label">${n}</span>
                            <span class="name-meta">${allNames[n].origin}</span>
                        </div>
                    `).join('');
            } else {
                grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); grid-column:1/-1;">Jméno nenalezeno.</p>';
            }
        }
    };

    window.showName = function(name) {
        const d = allNames[name];
        if (!d) return;

        document.getElementById('res-name').textContent = name;
        document.getElementById('res-meaning').textContent = `Původ: ${d.origin} | Význam: "${d.meaning}"`;
        document.getElementById('res-personality').textContent = d.personality;
        document.getElementById('res-nameday').textContent = d.nameday;
        document.getElementById('res-num').textContent = d.numerology;
        document.getElementById('res-aura').textContent = d.aura;
        document.getElementById('res-element').textContent = d.element;
        document.getElementById('res-love').textContent = d.love;
        document.getElementById('res-career').textContent = d.career;

        const r = document.getElementById('name-result');
        r.classList.add('show');
        r.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // SEO: Dynamic meta update
        const title = `Jméno ${name} — Původ, Význam a Numerologie | Mystická Hvězda`;
        const description = `${name}: ${d.personality.substring(0, 150)}... Duchovní výklad, barva aury a živel pro jméno ${name}.`;
        document.title = title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', description);
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?jmeno=' + encodeURIComponent(name);
        window.history.pushState({path:newUrl},'',newUrl);
    };

    document.getElementById('btn-search-name').addEventListener('click', searchName);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchName(); });

    // 5. Deep link support
    window.addEventListener('load', () => {
        const params = new URLSearchParams(window.location.search);
        const jmeno = params.get('jmeno');
        if (jmeno) {
            const checkData = setInterval(() => {
                if (Object.keys(allNames).length > 0) {
                    const exact = Object.keys(allNames).find(n => n.toLowerCase() === jmeno.toLowerCase());
                    if (exact) showName(exact);
                    clearInterval(checkData);
                }
            }, 100);
            setTimeout(() => clearInterval(checkData), 3000);
        }
    });
