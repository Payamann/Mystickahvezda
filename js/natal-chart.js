/**
 * Mystická Hvězda - Natal Chart Visualization (AI-Powered)
 * Uses Gemini AI for personalized life narrative generation
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Natal Chart JS loaded');
    initNatalChart();
});

const ZODIAC_SIGNS = [
    { symbol: '♈', name: 'Beran', angle: 0 },
    { symbol: '♉', name: 'Býk', angle: 30 },
    { symbol: '♊', name: 'Blíženci', angle: 60 },
    { symbol: '♋', name: 'Rak', angle: 90 },
    { symbol: '♌', name: 'Lev', angle: 120 },
    { symbol: '♍', name: 'Panna', angle: 150 },
    { symbol: '♎', name: 'Váhy', angle: 180 },
    { symbol: '♏', name: 'Štír', angle: 210 },
    { symbol: '♐', name: 'Střelec', angle: 240 },
    { symbol: '♑', name: 'Kozoroh', angle: 270 },
    { symbol: '♒', name: 'Vodnář', angle: 300 },
    { symbol: '♓', name: 'Ryby', angle: 330 }
];

const PLANETS = [
    { symbol: '☀️', name: 'Slunce', color: '#FFD700', img: 'img/planets/sun.webp', size: 60, desc: 'Vaše základní podstata a ego.' },
    { symbol: '🌙', name: 'Měsíc', color: '#C0C0C0', img: 'img/planets/moon.webp', size: 40, desc: 'Emoce, intuice a vnitřní svět.' },
    { symbol: '☿️', name: 'Merkur', color: '#B0C4DE', img: 'img/planets/mercury.webp', size: 30, desc: 'Komunikace a myšlení.' },
    { symbol: '♀️', name: 'Venuše', color: '#FFB6C1', img: 'img/planets/venus.webp', size: 35, desc: 'Láska, krása a hodnoty.' },
    { symbol: '♂️', name: 'Mars', color: '#FF4500', img: 'img/planets/mars.webp', size: 32, desc: 'Energie, akce a touha.' },
    { symbol: '♃', name: 'Jupiter', color: '#E6E6FA', img: 'img/planets/jupiter.webp', size: 55, desc: 'Štěstí, expanze a růst.' },
    { symbol: '♄', name: 'Saturn', color: '#708090', img: 'img/planets/saturn_rings.webp', size: 50, hasRing: true, desc: 'Disciplína a zkoušky.' }
];

function initNatalChart() {
    const zodiacGroup = document.getElementById('zodiac-ring');
    const planetsGroup = document.getElementById('planets-layer');
    const form = document.getElementById('natal-form');

    if (!zodiacGroup || !planetsGroup) {
        console.error('SVG elements not found!');
        return;
    }

    // Render Zodiac Ring
    renderZodiacRing(zodiacGroup);

    // Render demo planets on load (random positions)
    generatePlanets(planetsGroup, 42); // Demo seed for initial display

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await generateNatalChart(planetsGroup);
        });
    }

    // Handle "Use my profile" checkbox
    const useProfileCheckbox = document.getElementById('use-profile-natal');
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
                // Check login status first via token presence
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
                    // Fetch fresh data from server using centralized method
                    const user = await window.Auth.getProfile();

                    if (!user) {
                        throw new Error('Nepodařilo se načíst profil.');
                    }


                    if (user.first_name) document.getElementById('name').value = user.first_name;

                    if (user.birth_date) {
                        try {
                            const d = new Date(user.birth_date);
                            if (!isNaN(d.getTime())) {
                                document.getElementById('birth-date').value = d.toISOString().split('T')[0];
                            } else {
                                document.getElementById('birth-date').value = user.birth_date;
                            }
                        } catch (err) {
                            console.warn('Error formatting birth_date:', err);
                        }
                    }

                    if (user.birth_time) {
                        const t = user.birth_time.toString();
                        document.getElementById('birth-time').value = t.length > 5 ? t.substring(0, 5) : t;
                    }

                    if (user.birth_place) document.getElementById('birth-place').value = user.birth_place;

                } catch (error) {
                    console.error('Autofill Error:', error);
                    window.Auth?.showToast?.('Chyba', 'Nepodařilo se stáhnout data z profilu.', 'error');
                    e.target.checked = false;
                }
            }
        });
    }
}

function renderZodiacRing(group) {
    // Widened ring for larger symbols
    const radius = 222; // Center of the ring text

    ZODIAC_SIGNS.forEach((sign, index) => {
        const angleRad = (sign.angle - 90) * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central"); // Better vertical centering
        text.setAttribute("fill", "var(--color-mystic-gold)");
        text.setAttribute("font-size", "36"); // Reduced from 48 (-25%, close to requested 30%)
        text.setAttribute("transform", `rotate(${sign.angle}, ${x}, ${y})`);
        text.textContent = sign.symbol;

        const divAngleRad = (sign.angle - 15 - 90) * (Math.PI / 180);
        // Helper lines - adjusted for wide band
        const x1 = Math.cos(divAngleRad) * 195; // Inner radius
        const y1 = Math.sin(divAngleRad) * 195;
        const x2 = Math.cos(divAngleRad) * 248; // Outer radius (almost to edge 250)
        const y2 = Math.sin(divAngleRad) * 248;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "rgba(212, 175, 55, 0.2)");
        line.setAttribute("stroke-width", "1");

        group.appendChild(line);
        group.appendChild(text);
    });
}

function generatePlanets(group, seed) {
    console.log('Generating planets with seed:', seed);
    // Orbital radii - slightly compressed to make room for larger zodiac ring
    // Saturn at 165 + RingRadius(~25) = 190 max extent.
    // Inner zodiac ring will be at 195.
    const orbitRadii = [0, 35, 60, 85, 110, 135, 165];
    const orbitSpeeds = [0, 30, 25, 40, 60, 120, 180];

    // Clear existing
    group.innerHTML = '';

    // Add definitions for clip paths
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    group.appendChild(defs);

    PLANETS.forEach((planet, index) => {
        // Adjust sizes in data (done below via override or permanent change)
        // We will override sizes here for visual consistency
        const sizes = [46, 26, 20, 24, 22, 36, 34]; // Keeping sizes as is
        planet.size = sizes[index];

        const isSun = index === 0;
        const isSaturn = planet.name === 'Saturn';
        const radius = isSun ? 0 : orbitRadii[index];
        const speed = isSun ? 0 : orbitSpeeds[index];

        let angle = (seed * 37 + index * 55) % 360;

        // Create orbit wrapper for animation
        const orbitWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
        orbitWrapper.setAttribute("class", "orbit-path");

        // Orbit ring
        if (!isSun) {
            const orbitRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            orbitRing.setAttribute("cx", 0);
            orbitRing.setAttribute("cy", 0);
            orbitRing.setAttribute("r", radius);
            orbitRing.setAttribute("fill", "none");
            orbitRing.setAttribute("stroke", "rgba(255,255,255,0.05)");
            orbitRing.setAttribute("stroke-width", "1");
            group.appendChild(orbitRing);

            const animateOrbit = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
            animateOrbit.setAttribute("attributeName", "transform");
            animateOrbit.setAttribute("type", "rotate");
            animateOrbit.setAttribute("from", "0 0 0");
            animateOrbit.setAttribute("to", "360 0 0");
            animateOrbit.setAttribute("dur", `${speed}s`);
            animateOrbit.setAttribute("repeatCount", "indefinite");
            orbitWrapper.appendChild(animateOrbit);
        }

        const angleRad = (angle - 90) * (Math.PI / 180);
        const x = isSun ? 0 : Math.cos(angleRad) * radius;
        const y = isSun ? 0 : Math.sin(angleRad) * radius;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${x}, ${y})`);
        g.setAttribute("class", "planet-node");

        // PLANET IMAGE
        const imgSize = planet.size;
        const radiusPx = imgSize / 2;

        // Create a group for the planet graphics
        const planetG = document.createElementNS("http://www.w3.org/2000/svg", "g");

        // 1. Add a fallback circle (Hidden by default, shown on error)
        // We set it to display:none initially to prevent the "white edge" flash
        const fallback = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        fallback.setAttribute("r", radiusPx - 2);
        fallback.setAttribute("fill", planet.color || "#FFF");
        fallback.setAttribute("opacity", "0.8");
        fallback.style.display = 'none';
        planetG.appendChild(fallback);

        // 2. Add the Image
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        // Use both href and xlink:href for maximum compatibility
        image.setAttribute("href", planet.img);
        image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", planet.img);

        image.setAttribute("width", imgSize);
        image.setAttribute("height", imgSize);
        image.setAttribute("x", -radiusPx);
        image.setAttribute("y", -radiusPx);

        if (isSaturn) {
            // Use MASK logic for Saturn
            // We need to apply the mask to the image, and ensure the image is large enough
            // BUT specific mask handling requires matching dimensions.
            // Simplified approach: Render image normally, but use 'mask' attribute pointing to a clone of itself?
            // Actually, simply using the mix-blend-mode 'screen' SHOULD have worked perfectly if bg is black.
            // If it failed, it's likely due to browser composition.
            // Let's try explicit Masking:
            // We need a definition of the mask that IS the image.

            // Re-define mask specifically for this instance to capture size
            const maskId = `mask-saturn-${index}`;
            const sMask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
            sMask.setAttribute("id", maskId);
            const sMaskImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
            sMaskImg.setAttribute("href", planet.img);
            sMaskImg.setAttribute("width", imgSize * 1.5);
            sMaskImg.setAttribute("height", imgSize * 1.5);
            sMaskImg.setAttribute("x", -(imgSize * 1.5) / 2);
            sMaskImg.setAttribute("y", -(imgSize * 1.5) / 2);
            sMask.appendChild(sMaskImg);
            defs.appendChild(sMask);

            image.setAttribute("width", imgSize * 1.5);
            image.setAttribute("height", imgSize * 1.5);
            image.setAttribute("x", -(imgSize * 1.5) / 2);
            image.setAttribute("y", -(imgSize * 1.5) / 2);

            // Apply the mask
            image.setAttribute("mask", `url(#${maskId})`);
            image.style.mixBlendMode = 'normal'; // Reset blend

            // Note: If the star background is behind, the black parts of the image (in the mask) become transparent.
            // However, the planet body itself (tan/brown) is lighter than black, so it stays opaque.
            // The black background is black (val 0), so it becomes transparent.

        } else {
            // For rounded planets: Use Clip Path
            const clipId = `clip-${index}-${seed}`;
            const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
            clipPath.setAttribute("id", clipId);
            const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            clipCircle.setAttribute("cx", 0);
            clipCircle.setAttribute("cy", 0);
            // Cut 3px to eliminate edges without cutting too much texture
            clipCircle.setAttribute("r", Math.max(0, radiusPx - 3));
            clipPath.appendChild(clipCircle);
            defs.appendChild(clipPath);

            image.setAttribute("clip-path", `url(#${clipId})`);

            // Removed drop-shadow to prevent "white edge" artifacts completely
            image.style.filter = "none";
        }

        // Optional: Add simple rotation if desired, currently disabled to keep it stable
        // if (!isSun) { }

        // Show fallback only on error
        image.addEventListener('error', (e) => {
            console.error(`Failed to load image for ${planet.name}: ${planet.img}`);
            image.style.display = 'none';
            fallback.style.display = 'block';
        });

        planetG.appendChild(image);

        // Add a glow ring/atmosphere (only for Sun or if desired)
        // Removed for other planets to prevent "white edge" look if stroke is too bright
        if (isSun) {
            const atmosphere = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            atmosphere.setAttribute("r", radiusPx);
            atmosphere.setAttribute("fill", "none");
            atmosphere.setAttribute("stroke", "#FFD700");
            atmosphere.setAttribute("stroke-width", "2");
            atmosphere.setAttribute("opacity", "0.5");
            atmosphere.style.filter = "blur(4px)";
            planetG.appendChild(atmosphere);
        }

        g.appendChild(planetG);

        // Add planet to orbit wrapper
        orbitWrapper.appendChild(g);
        group.appendChild(orbitWrapper);

        // Animation: Fade in
        orbitWrapper.style.opacity = 0;
        setTimeout(() => {
            orbitWrapper.style.transition = 'opacity 0.5s ease';
            orbitWrapper.style.opacity = 1;
        }, index * 150);
    });
}

async function generateNatalChart(planetsGroup) {
    const btn = document.querySelector('#natal-form button');
    const originalHTML = btn.innerHTML; // Capture full HTML (icons etc.)
    const name = document.getElementById('name').value;
    const birthDate = document.getElementById('birth-date').value;
    const birthTime = document.getElementById('birth-time').value;
    const birthPlace = document.getElementById('birth-place').value;

    btn.innerHTML = '<span class="loading-spinner"></span> Navazuji spojení s vesmírem...';
    btn.classList.add('btn--processing');
    btn.disabled = true;

    // Clear previous
    planetsGroup.innerHTML = '';
    document.getElementById('chart-results').style.display = 'none';

    // Get or create AI results container
    let aiResultsDiv = document.getElementById('ai-interpretation');
    if (!aiResultsDiv) {
        aiResultsDiv = createAIResultsContainer();
    }
    aiResultsDiv.style.display = 'none';

    try {
        // Generate pseudo-positions for visual
        const seed = name.length + birthDate.length;
        generatePlanets(planetsGroup, seed);

        // Calculate sign positions for display
        // Calculate REAL zodiac sign based on date
        const dateObj = new Date(`${birthDate}T${birthTime || '12:00'}`);
        const sunSignResult = getZodiacSign(dateObj);

        // Update Transits (Phase 2)
        if (typeof updateTransits === 'function') {
            updateTransits(birthDate);
        }

        let sunAngleRaw = 0;
        let sunSign = ZODIAC_SIGNS[0];

        if (sunSignResult) {
            sunSign = sunSignResult;
            // Approximate position in the sign (middle + some day variance?)
            // For now, place it in the middle of the sign for visual clarity
            sunAngleRaw = sunSign.angle + 15;
        } else {
            // Fallback if date is invalid
            sunAngleRaw = (seed * 37) % 360;
            sunSign = getSignFromAngle(sunAngleRaw);
        }

        // Keep other planets random/demo for now as we don't have an ephemeris library client-side
        // But we MUST fix the Sun as it defines the "Sign" user sees.

        // Planets already generated above with the same seed - no need to regenerate

        // Hack: Update the Sun's rotation to match the calculated sign
        const sunOrbit = planetsGroup.querySelector('.planet-node').parentElement;
        // Sun is index 0. We need to find the element and rotate it correctly.
        // Actually generatePlanets calculates angles inside loop. 
        // Let's modify generatePlanets or just manually update the transform of the first element.

        // Better approach: Re-call generatePlanets but pass the Sun Angle explicitly?
        // Let's just fix the text labels first, and then maybe update the visual rotation if possible.
        // Actually, easier to just update the text content as that's what user reads.
        // But visual should match.

        // Let's implement a simple visual fix:
        const sunNode = planetsGroup.querySelector('.planet-node'); // First one is Sun
        if (sunNode) {
            // Sun is at (0,0) usually? No, generatePlanets puts it at (0,0) because index 0 radius is 0?
            // Wait, lines 200: const radius = isSun ? 0 : orbitRadii[index];
            // If Sun is at 0,0 (center), its rotation doesn't matter for position usually, BUT
            // Natal charts usually place Earth at center and Sun on the ring?
            // Line 27: Sun radius 0... wait.
            // If Sun is at center, then this is Heliocentric? Or just "Symbolic"?
            // Ah, looking at the code: "radius = isSun ? 0 : ..."
            // If Sun is at 0,0, then it's in the CENTER.
            // But a Natal Chart usually has the Earth in center and Sun in a Zodiac sign ON THE RING.
            // This existing visualization seems to put Sun in the center (Heliocentric-ish or just "You are the sun"?).
            // IF the Sun is in the center, it doesn't "have" a zodiac sign visually in this specific chart design.
            // BUT users expect to see "Sun in Capricorn".
            // ...
            // I will leave the visual design as is (Sun center) if that's the intent, 
            // but I MUST ensure the TEXT below is correct.
        }

        // Show basic results (Text)
        document.getElementById('res-sun').textContent = `${sunSign.name}`;
        // Moon and Ascendant are still random/estimated as we don't have real calculation
        // But Sun is deterministic.
        document.getElementById('tip-sign').textContent = sunSign.name;
        document.getElementById('chart-results').style.display = 'block';

        // Call AI for interpretation
        btn.innerHTML = '<span class="loading-spinner"></span> Navazuji spojení s hvězdami...';

        // Call API
        const authToken = localStorage.getItem('auth_token') || window.Auth?.token;
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/natal-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({
                birthDate,
                birthTime,
                birthPlace,
                name
            })
        });

        const data = await response.json();

        if (data.success) {
            // Display AI interpretation with typewriter effect
            aiResultsDiv.style.display = 'block';
            const contentDiv = aiResultsDiv.querySelector('.ai-content');
            await typewriterEffect(contentDiv, data.response);

            // Save to history if logged in and add favorite button
            if (window.Auth && window.Auth.saveReading) {
                const saveResult = await window.Auth.saveReading('natal-chart', {
                    name,
                    birthDate,
                    birthTime,
                    birthPlace,
                    interpretation: data.response
                });

                // Store reading ID and add favorite button
                if (saveResult && saveResult.id) {
                    window.currentNatalChartReadingId = saveResult.id;

                    // Add favorite button after interpretation
                    const favoriteBtn = document.createElement('div');
                    favoriteBtn.className = 'text-center';
                    favoriteBtn.style.marginTop = 'var(--space-xl)';
                    favoriteBtn.innerHTML = `
                        <button id="favorite-natal-btn" class="btn btn--glass" style="min-width: 200px;">
                            <span class="favorite-icon">⭐</span> Přidat do oblíbených
                        </button>
                    `;
                    contentDiv.appendChild(favoriteBtn);

                    // Attach listener
                    document.getElementById('favorite-natal-btn').addEventListener('click', async () => {
                        await toggleFavorite(window.currentNatalChartReadingId, 'favorite-natal-btn');
                    });
                }
            }

        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('Natal Chart Error:', error);
        aiResultsDiv.style.display = 'block';
        aiResultsDiv.querySelector('.ai-content').textContent =
            'Hvězdy momentálně odmítají odhalit svá tajemství. Zkuste to prosím později.';
    }

    btn.innerHTML = originalHTML; // Restore full HTML
    btn.disabled = false;
    btn.classList.remove('btn--processing');
    document.getElementById('chart-results').scrollIntoView({ behavior: 'smooth' });
}

function createAIResultsContainer() {
    const container = document.createElement('div');
    container.id = 'ai-interpretation';
    container.style.cssText = `
        margin-top: var(--space-xl);
        padding: var(--space-xl);
        background: linear-gradient(135deg, rgba(155, 89, 182, 0.1) 0%, rgba(10, 10, 26, 0.9) 100%);
        border: 1px solid var(--color-mystic-gold);
        border-radius: var(--radius-lg);
    `;
    container.innerHTML = `
        <h4 style="color: var(--color-mystic-gold); margin-bottom: var(--space-md);">
            ✨ Váš osobní hvězdný příběh
        </h4>
        <div class="ai-content" style="color: var(--color-starlight); line-height: 1.8; white-space: pre-wrap;"></div>
    `;

    // Insert after chart-results
    const chartResults = document.getElementById('chart-results');
    chartResults.parentNode.insertBefore(container, chartResults.nextSibling);

    return container;
}

function getSignFromAngle(angle) {
    const index = Math.floor(angle / 30);
    return ZODIAC_SIGNS[index % 12];
}

async function typewriterEffect(element, htmlContent) {
    element.style.opacity = '0';
    element.innerHTML = htmlContent;

    // Small delay to ensure DOM update
    await new Promise(r => setTimeout(r, 100));

    element.style.transition = 'opacity 1.5s ease-in-out';
    element.style.opacity = '1';

    // Scroll into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Calculates the Zodiac sign based on date.
 * @param {Date} date 
 * @returns {Object} Zodiac sign object from ZODIAC_SIGNS
 */
function getZodiacSign(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // 0-indexed

    // Boundaries aligned with data/zodiac-matrix.json
    if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return ZODIAC_SIGNS.find(s => s.name === 'Kozoroh');
    if ((month == 1 && day >= 21) || (month == 2 && day <= 20)) return ZODIAC_SIGNS.find(s => s.name === 'Vodnář');
    if ((month == 2 && day >= 21) || (month == 3 && day <= 20)) return ZODIAC_SIGNS.find(s => s.name === 'Ryby');
    if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return ZODIAC_SIGNS.find(s => s.name === 'Beran');
    if ((month == 4 && day >= 21) || (month == 5 && day <= 21)) return ZODIAC_SIGNS.find(s => s.name === 'Býk');
    if ((month == 5 && day >= 22) || (month == 6 && day <= 21)) return ZODIAC_SIGNS.find(s => s.name === 'Blíženci');
    if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return ZODIAC_SIGNS.find(s => s.name === 'Rak');
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return ZODIAC_SIGNS.find(s => s.name === 'Lev');
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return ZODIAC_SIGNS.find(s => s.name === 'Panna');
    if ((month == 9 && day >= 23) || (month == 10 && day <= 23)) return ZODIAC_SIGNS.find(s => s.name === 'Váhy');
    if ((month == 10 && day >= 24) || (month == 11 && day <= 22)) return ZODIAC_SIGNS.find(s => s.name === 'Štír');
    if ((month == 11 && day >= 23) || (month == 12 && day <= 21)) return ZODIAC_SIGNS.find(s => s.name === 'Střelec');

    return ZODIAC_SIGNS[0]; // Fallback
}


function updateTransits(birthDate) {
    const section = document.getElementById('transits-now');
    if (!section) return;

    // Dates
    const now = new Date();
    const dob = new Date(birthDate);

    // Signs
    const currentSunSign = getZodiacSign(now);
    const natalSunSign = getZodiacSign(dob);

    const currentSunIndex = ZODIAC_SIGNS.findIndex(s => s.name === currentSunSign.name);
    const natalSunIndex = ZODIAC_SIGNS.findIndex(s => s.name === natalSunSign.name);

    // Calculate Aspect (simple distance)
    let diff = Math.abs(currentSunIndex - natalSunIndex);
    if (diff > 6) diff = 12 - diff;

    // Messages based on relationship
    let message = '';
    let title = `Slunce ve znamení ${currentSunSign.name}`;
    let subtitle = `vůči vašemu ${natalSunSign.name}`;

    if (diff === 0) {
        message = `☀️ <strong>Všechno nejlepší k narozeninám!</strong> (nebo blízko nich). Slunce se vrací na své natální místo. Je to začátek vašeho nového osobního roku. Cítíte příliv energie a jasnosti. Skvělý čas pro stanovení cílů.`;
    } else if (diff === 6) {
        message = `⚖️ <strong>Opozice:</strong> Slunce stojí naproti vašemu znamení. Můžete pociťovat napětí ve vztazích nebo potřebu vyvážit své ego s potřebami druhých. Pozor na konflikty, ale využijte energii k ujasnění postojů.`;
    } else if (diff === 3 || diff === 9) { // Square
        message = `⚡ <strong>Výzva:</strong> Slunce je v kvadratuře k vašemu znamení. Toto období přináší dynamickou energii, která vás nutí k akci. Překážky jsou jen maskované příležitosti k růstu.`;
    } else if (diff === 4 || diff === 8) { // Trine
        message = `🌊 <strong>Flow:</strong> Slunce je v harmonickém trigonu. Věci by měly jít hladce, cítíte podporu vesmíru. Využijte tento čas pro kreativitu a odpočinek.`;
    } else {
        message = `Slunce aktuálně prochází znamením <strong>${currentSunSign.name}</strong>. Tato energie osvětluje jinou část vašeho života než obvykle. Vnímejte, jak se změnila atmosféra oproti minulému měsíci.`;
    }

    // Update UI
    document.getElementById('transit-date').textContent = now.toLocaleDateString('cs-CZ');
    document.getElementById('transit-title').textContent = title;
    document.getElementById('transit-subtitle').textContent = subtitle;
    document.getElementById('transit-message').innerHTML = message;

    section.style.display = 'block';
}
