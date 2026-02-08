/**
 * Astrocartography - Interactive Map Feature
 * Mystická Hvězda
 */

// API Configuration
const API_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';

// DOM Elements
const form = document.getElementById('astro-form');
const resultsContainer = document.getElementById('astro-results');
const loadingIndicator = document.getElementById('astro-loading');
const mapContainer = document.querySelector('.map-container');

// Intention select for personalized results
const INTENTIONS = {
    'obecny': 'Obecná analýza',
    'kariera': 'Kariéra a úspěch',
    'laska': 'Láska a vztahy',
    'zdravi': 'Zdraví a vitalita',
    'duchovno': 'Duchovní růst'
};

// City coordinates for map visualization (approximate positions as %)
const CITY_POSITIONS = {
    'praha': { x: 52, y: 34, aliases: ['praha', 'praze', 'prague'] },
    'londýn': { x: 47, y: 32, aliases: ['londýn', 'londýně', 'london'] },
    'paříž': { x: 48, y: 34, aliases: ['paříž', 'paříži', 'paris'] },
    'new york': { x: 26, y: 37, aliases: ['new york', 'new yorku', 'nyc'] },
    'los angeles': { x: 15, y: 39, aliases: ['los angeles', 'la', 'kalifornie'] },
    'tokyo': { x: 85, y: 38, aliases: ['tokyo', 'tokiu', 'tokyu', 'japonsko'] },
    'sydney': { x: 89, y: 72, aliases: ['sydney', 'austrálie'] },
    'perth': { x: 80, y: 68, aliases: ['perth', 'perthu', 'západní austrálie'] },
    'borabora': { x: 5, y: 60, aliases: ['bora bora', 'francouzská polynésie'] },
    'barcelona': { x: 47, y: 37, aliases: ['barcelona', 'barceloně', 'španělsko'] },
    'berlín': { x: 51, y: 32, aliases: ['berlín', 'berlíně', 'německo'] },
    'řím': { x: 52, y: 37, aliases: ['řím', 'římě', 'itálie'] },
    'florencie': { x: 51, y: 36, aliases: ['florencie', 'florencii', 'toskánsko'] },
    'benátky': { x: 52, y: 35, aliases: ['benátky', 'benátkách'] },
    'dubaj': { x: 62, y: 44, aliases: ['dubaj', 'dubaji', 'sae'] },
    'singapur': { x: 78, y: 55, aliases: ['singapur', 'singapuru'] },
    'mumbai': { x: 68, y: 48, aliases: ['mumbai', 'bombaj', 'bombaji', 'indie'] },
    'bali': { x: 82, y: 60, aliases: ['bali', 'indonésie'] },
    'bangkok': { x: 77, y: 50, aliases: ['bangkok', 'thajsko'] },
    'istanbul': { x: 56, y: 37, aliases: ['istanbul', 'turecko'] },
    'vídeň': { x: 53, y: 35, aliases: ['vídeň', 'vídni', 'rakousko'] },
    'amsterdam': { x: 48, y: 31, aliases: ['amsterdam', 'nizozemsko'] },
    'toronto': { x: 25, y: 34, aliases: ['toronto', 'kanada'] },
    'san francisco': { x: 14, y: 38, aliases: ['san francisco', 'sf'] },
    'miami': { x: 25, y: 45, aliases: ['miami', 'florida'] },
    'rio de janeiro': { x: 36, y: 65, aliases: ['rio de janeiro', 'rio', 'brazílie'] },
    'buenos aires': { x: 32, y: 72, aliases: ['buenos aires', 'argentina'] },
    'kapské město': { x: 55, y: 75, aliases: ['kapské město', 'johannesburg', 'jižní afrika'] },
    'káhira': { x: 56, y: 42, aliases: ['káhira', 'egypt'] },
    'moskva': { x: 60, y: 28, aliases: ['moskva', 'rusko'] },
    'reykjavík': { x: 40, y: 22, aliases: ['reykjavík', 'reykjavik', 'island'] },
    'havaj': { x: 3, y: 45, aliases: ['havaj', 'hawaii', 'honolulu'] }
};

// Planet colors for visualization
const PLANET_COLORS = {
    'slunce': '#f1c40f',
    'měsíc': '#bdc3c7',
    'merkur': '#9b59b6',
    'venuše': '#e91e8c',
    'mars': '#e74c3c',
    'jupiter': '#d4af37',
    'saturn': '#7f8c8d',
    'uran': '#00d9ff',
    'neptun': '#3498db',
    'pluto': '#2c3e50'
};

/**
 * Initialize the astrocartography feature
 */
function init() {
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);

    // Add hover effects to existing lines
    initMapInteractions();

    // Handle "Use my profile" checkbox
    const useProfileCheckbox = document.getElementById('use-profile-astro');
    if (useProfileCheckbox) {
        // Toggle visibility based on auth
        const wrapper = useProfileCheckbox.closest('.checkbox-wrapper');
        if (wrapper) {
            const updateVisibility = () => {
                wrapper.style.display = (window.Auth && window.Auth.isLoggedIn()) ? 'flex' : 'none';
            };
            updateVisibility();
            document.addEventListener('auth:changed', updateVisibility);
        }

        useProfileCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if (!window.Auth?.token) {
                    if (window.Auth?.showToast) {
                        window.Auth.showToast('Info', 'Pro použití profilu se prosím přihlaste.', 'info');
                    } else {
                        alert('Pro použití profilu se prosím přihlaste.');
                    }
                    e.target.checked = false;
                    return;
                }

                try {
                    const user = await window.Auth.getProfile();

                    if (!user) {
                        throw new Error('Nepodařilo se načíst profil.');
                    }


                    if (user.first_name) {
                        const nameInput = document.getElementById('astro-name');
                        if (nameInput) nameInput.value = user.first_name;
                    }

                    if (user.birth_date) {
                        const dateInput = document.getElementById('astro-date');
                        if (dateInput) {
                            try {
                                const d = new Date(user.birth_date);
                                if (!isNaN(d.getTime())) {
                                    dateInput.value = d.toISOString().split('T')[0];
                                } else {
                                    dateInput.value = user.birth_date;
                                }
                            } catch (err) {
                                console.warn('Error formatting birth_date:', err);
                            }
                        }
                    }

                    if (user.birth_time) {
                        const timeInput = document.getElementById('astro-time');
                        if (timeInput) {
                            const t = user.birth_time.toString();
                            timeInput.value = t.length > 5 ? t.substring(0, 5) : t;
                        }
                    }

                    if (user.birth_place) {
                        const placeInput = document.getElementById('astro-place');
                        if (placeInput) placeInput.value = user.birth_place;
                    }

                } catch (error) {
                    console.error('Autofill Error:', error);
                    window.Auth?.showToast?.('Chyba', 'Nepodařilo se stáhnout data z profilu.', 'error');
                    e.target.checked = false;
                }
            }
        });
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // PREMIUM CHECK
    // Astro Cartography is Premium Only feature
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        window.Auth?.showToast('Přihlášení vyžadováno', 'Pro zobrazení vaší hvězdné mapy se musíte přihlásit.', 'info');
        window.Auth?.openModal('login');
        return;
    }

    if (!window.Auth.isPremium()) {
        showError(`
            <div class="text-center">
                <h3>🔒 Premium Funkce</h3>
                <p class="mb-lg">Astrokartografie je dostupná pouze pro Hvězdné Průvodce.</p>
                <a href="cenik.html" class="btn btn--primary">Získat Premium</a>
            </div>
        `);
        return;
    }

    const name = document.getElementById('astro-name')?.value;
    const birthDate = document.getElementById('astro-date')?.value;
    const birthTime = document.getElementById('astro-time')?.value;
    const birthPlace = document.getElementById('astro-place')?.value;
    const intention = document.getElementById('astro-intention')?.value || 'obecny';

    if (!birthDate || !birthTime || !birthPlace) {
        showError('Prosím vyplňte všechny povinné údaje.');
        return;
    }

    // Show loading state
    showLoading();

    try {
        const response = await fetch(`${API_URL}/astrocartography`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                birthDate,
                birthTime,
                birthPlace,
                intention: INTENTIONS[intention] || intention
            })
        });

        const data = await response.json();

        if (data.success) {
            displayResults(data.response);
            highlightCitiesFromResponse(data.response);
        } else {
            showError(data.error || 'Něco se pokazilo...');
        }
    } catch (error) {
        console.error('Astrocartography Error:', error);
        showError('Nepodařilo se spojit s hvězdným serverem. Zkuste to později.');
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
    // Animate map
    if (mapContainer) {
        mapContainer.classList.add('calculating');
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    if (mapContainer) {
        mapContainer.classList.remove('calculating');
    }
}

const PLANET_INTENTIONS = {
    'obecny': ['slunce', 'jupiter', 'měsíc'],
    'kariera': ['slunce', 'jupiter', 'mars', 'merkur'],
    'laska': ['venuše', 'měsíc', 'neptun'],
    'zdravi': ['slunce', 'měsíc', 'jupiter'],
    'duchovno': ['neptun', 'jupiter', 'uran', 'pluto'],
    'rodina': ['měsíc', 'venuše'],
};

/**
 * Display AI response
 */
function displayResults(response) {
    hideLoading();

    // Get current intention
    const intentionSelect = document.getElementById('astro-intention');
    const currentIntention = intentionSelect ? intentionSelect.value : 'obecny';
    const intentionName = INTENTIONS[currentIntention] || 'Obecná analýza';

    // Generate Tip - REMOVED per user request
    const relevantPlanets = PLANET_INTENTIONS[currentIntention] || [];
    let tipHtml = '';

    // Tip generation code removed
    /*
    if (relevantPlanets.length > 0) {
        // ... code removed ...
    }
    */

    if (resultsContainer) {
        // Parse markdown-like bold to html bold if raw text
        // Assuming response is text. We can do simple formatting.
        let formattedResponse = response;
        if (!response.includes('<')) {
            formattedResponse = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }

        resultsContainer.innerHTML = `
            <div class="astro-result-card" data-animate>
                <h3 class="result-title">🗺️ Vaše Astrokartografická Mapa</h3>
                <div class="result-content">
                    ${formattedResponse}
                </div>
                ${tipHtml}
            </div>
        `;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Show error message
 */
function showError(message) {
    hideLoading();

    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="astro-error">
                <span class="error-icon">⚠️</span>
                <p>${message}</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

/**
 * Highlight cities mentioned in the AI response on the map
 */
function highlightCitiesFromResponse(response) {
    const lowerResponse = response.toLowerCase();

    // Remove existing city markers
    document.querySelectorAll('.city-marker').forEach(m => m.remove());

    // Find mentioned cities and add markers
    Object.entries(CITY_POSITIONS).forEach(([city, pos]) => {
        // Check primary key OR any alias
        const isMatch = lowerResponse.includes(city) || (pos.aliases && pos.aliases.some(alias => lowerResponse.includes(alias)));

        if (isMatch) {
            addCityMarker(city, pos.x, pos.y, isPraisedCity(lowerResponse, city, pos.aliases));
        }
    });
}

/**
 * Check if a city is mentioned positively in the response
 */
function isPraisedCity(response, city, aliases = []) {
    let closestIndex = -1;

    // Find matching index (try city name first, then aliases)
    const allNames = [city, ...aliases];
    for (const name of allNames) {
        const idx = response.indexOf(name);
        if (idx !== -1) {
            closestIndex = idx;
            break;
        }
    }

    if (closestIndex === -1) return false;

    // Check surrounding context for positive/negative words
    const context = response.substring(Math.max(0, closestIndex - 50), closestIndex + 50);
    const positiveWords = ['přízniv', 'ideální', 'doporuč', 'štěstí', 'lásk', 'úspěch', 'harmoni', 'pozitivní', 'růst', 'hojnost'];
    const negativeWords = ['náročn', 'výzv', 'konflikt', 'vyhnou', 'nebezpeč', 'obtížn', 'zkoušk'];

    const isPositive = positiveWords.some(word => context.includes(word));
    const isNegative = negativeWords.some(word => context.includes(word));

    if (isNegative && !isPositive) return false; // Lean towards positive/neutral unless explicitly negative
    return true;
}

/**
 * Add a city marker to the map
 */
function addCityMarker(city, x, y, isPositive) {
    if (!mapContainer) return;

    const marker = document.createElement('div');
    marker.className = `city-marker ${isPositive ? 'positive' : 'negative'}`;
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.innerHTML = `
        <span class="marker-dot"></span>
        <span class="marker-label">${city.charAt(0).toUpperCase() + city.slice(1)}</span>
    `;
    marker.title = city;

    mapContainer.appendChild(marker);

    // Animate marker appearance
    setTimeout(() => {
        marker.classList.add('visible');
    }, 100);
}

/**
 * Initialize map interactions (hover effects on existing lines)
 */
function initMapInteractions() {
    document.querySelectorAll('.planet-line').forEach(line => {
        line.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('map-tooltip');
            if (tooltip) {
                tooltip.querySelector('p').textContent = e.target.dataset.info;
                tooltip.style.opacity = '1';
            }
        });
        line.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('map-tooltip');
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
