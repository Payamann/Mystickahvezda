/**
 * Mystická Hvězda - Natal Chart Visualization (AI-Powered)
 * Uses the server AI API for personalized life narrative generation.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.MH_DEBUG) console.debug('Natal Chart JS loaded');
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
    { id: 'sun', symbol: '☀️', name: 'Slunce', color: '#FFD700', img: 'img/planets/sun.webp', size: 60, desc: 'Vaše základní podstata a ego.' },
    { id: 'moon', symbol: '🌙', name: 'Měsíc', color: '#C0C0C0', img: 'img/planets/moon.webp', size: 40, desc: 'Emoce, intuice a vnitřní svět.' },
    { id: 'mercury', symbol: '☿️', name: 'Merkur', color: '#B0C4DE', img: 'img/planets/mercury.webp', size: 30, desc: 'Komunikace a myšlení.' },
    { id: 'venus', symbol: '♀️', name: 'Venuše', color: '#FFB6C1', img: 'img/planets/venus.webp', size: 35, desc: 'Láska, krása a hodnoty.' },
    { id: 'mars', symbol: '♂️', name: 'Mars', color: '#FF4500', img: 'img/planets/mars.webp', size: 32, desc: 'Energie, akce a touha.' },
    { id: 'jupiter', symbol: '♃', name: 'Jupiter', color: '#E6E6FA', img: 'img/planets/jupiter.webp', size: 55, desc: 'Štěstí, expanze a růst.' },
    { id: 'saturn', symbol: '♄', name: 'Saturn', color: '#708090', img: 'img/planets/saturn_rings.webp', size: 50, hasRing: true, desc: 'Disciplína a zkoušky.' }
];

const PLANET_ORBIT_RADII = [35, 55, 78, 101, 124, 146, 165];
const PLANET_ORBIT_SPEEDS = [0, 30, 25, 40, 60, 120, 180];
const PLANET_VISUAL_SIZES = [46, 26, 20, 24, 22, 36, 34];
const ASPECT_SHORT_LABELS = {
    conjunction: 'konj.',
    opposition: 'opo.',
    trine: 'tri.',
    square: 'kvad.',
    sextile: 'sex.'
};
const NATAL_PLANET_ORDER = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto'
];
const SVG_NS = "http://www.w3.org/2000/svg";

function buildNatalUpgradeUrl(source = 'natal_teaser_gate') {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', source);
    pricingUrl.searchParams.set('feature', 'natalni_interpretace');
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function startNatalUpgradeFlow(source = 'natal_teaser_gate') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'natalni_interpretace'
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source,
            feature: 'natalni_interpretace',
            redirect: '/cenik.html',
            authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
        });
        return;
    }

    window.location.href = buildNatalUpgradeUrl(source);
}

function setBlockVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('mh-block-visible', visible);
}

function setFlexVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('mh-flex-visible', visible);
}

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

    // Initialize 3D Chart
    if (window.Natal3D) {
        window.Natal3DInstance = new window.Natal3D('natal-3d-container');
    }

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
                setFlexVisible(wrapper, window.Auth && window.Auth.isLoggedIn());
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

    for (let degree = 0; degree < 360; degree += 5) {
        const angleRad = (degree - 90) * (Math.PI / 180);
        const isSignBoundary = degree % 30 === 0;
        const isTenDegree = degree % 10 === 0;
        const inner = isSignBoundary ? 194 : (isTenDegree ? 204 : 210);
        const outer = isSignBoundary ? 216 : 216;

        const tick = document.createElementNS(SVG_NS, "line");
        tick.setAttribute("x1", Math.cos(angleRad) * inner);
        tick.setAttribute("y1", Math.sin(angleRad) * inner);
        tick.setAttribute("x2", Math.cos(angleRad) * outer);
        tick.setAttribute("y2", Math.sin(angleRad) * outer);
        tick.setAttribute(
            "class",
            isSignBoundary
                ? "natal-zodiac-tick natal-zodiac-tick--sign"
                : (isTenDegree ? "natal-zodiac-tick natal-zodiac-tick--major" : "natal-zodiac-tick")
        );
        group.appendChild(tick);
    }

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

function generatePlanets(group, seed, planetPositions = null) {
    if (window.MH_DEBUG) console.debug('Generating planets with seed:', seed);

    // Clear existing
    group.innerHTML = '';

    // Add definitions for clip paths
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    group.appendChild(defs);

    PLANETS.forEach((planet, index) => {
        // Adjust sizes in data (done below via override or permanent change)
        // We will override sizes here for visual consistency
        planet.size = PLANET_VISUAL_SIZES[index];

        const isSun = index === 0;
        const isSaturn = planet.name === 'Saturn';
        const calculatedPlanet = planetPositions?.[planet.id];
        const hasCalculatedLongitude = typeof calculatedPlanet?.longitude === 'number';
        const radius = isSun && !hasCalculatedLongitude ? 0 : PLANET_ORBIT_RADII[index];
        const speed = isSun ? 0 : PLANET_ORBIT_SPEEDS[index];
        const shouldAnimate = !hasCalculatedLongitude && !isSun;

        let angle = hasCalculatedLongitude
            ? calculatedPlanet.longitude
            : (seed * 37 + index * 55) % 360;

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

            if (shouldAnimate) {
                const animateOrbit = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
                animateOrbit.setAttribute("attributeName", "transform");
                animateOrbit.setAttribute("type", "rotate");
                animateOrbit.setAttribute("from", "0 0 0");
                animateOrbit.setAttribute("to", "360 0 0");
                animateOrbit.setAttribute("dur", `${speed}s`);
                animateOrbit.setAttribute("repeatCount", "indefinite");
                orbitWrapper.appendChild(animateOrbit);
            }
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
        fallback.setAttribute("display", "none");
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
            image.classList.add('planet-image--normal');

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
            image.classList.add('planet-image--clean');
        }

        // Optional: Add simple rotation if desired, currently disabled to keep it stable
        // if (!isSun) { }

        // Show fallback only on error
        image.addEventListener('error', (e) => {
            console.error(`Failed to load image for ${planet.name}: ${planet.img}`);
            image.setAttribute("display", "none");
            fallback.removeAttribute("display");
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
            atmosphere.classList.add('sun-atmosphere');
            planetG.appendChild(atmosphere);
        }

        g.appendChild(planetG);

        // Add planet to orbit wrapper
        orbitWrapper.appendChild(g);
        group.appendChild(orbitWrapper);

        // Animation: Fade in
        orbitWrapper.classList.add('orbit-path--pending');
        setTimeout(() => {
            orbitWrapper.classList.add('orbit-path--visible');
        }, index * 150);
    });
}

function getPlanetVisualPoint(planetId, longitude) {
    const index = PLANETS.findIndex((planet) => planet.id === planetId);
    if (index < 0 || typeof longitude !== 'number') return null;

    const radius = PLANET_ORBIT_RADII[index];
    const angleRad = (longitude - 90) * (Math.PI / 180);
    return {
        x: Math.cos(angleRad) * radius,
        y: Math.sin(angleRad) * radius
    };
}

function clearNatalComputedLayers() {
    document.getElementById('houses-layer')?.replaceChildren();
    document.getElementById('aspects-layer')?.replaceChildren();
}

function renderNatalHouseLayer(chart) {
    const layer = document.getElementById('houses-layer');
    const houses = chart?.houses?.available ? chart.houses.houses : [];
    if (!layer || !houses.length) return;

    houses.forEach((house) => {
        const longitude = house.cuspLongitude;
        if (typeof longitude !== 'number') return;

        const angleRad = (longitude - 90) * (Math.PI / 180);
        const inner = 26;
        const outer = 192;
        const labelRadius = 184;
        const isAxis = [1, 4, 7, 10].includes(house.house);

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", Math.cos(angleRad) * inner);
        line.setAttribute("y1", Math.sin(angleRad) * inner);
        line.setAttribute("x2", Math.cos(angleRad) * outer);
        line.setAttribute("y2", Math.sin(angleRad) * outer);
        line.setAttribute("class", isAxis ? "natal-house-line natal-house-line--axis" : "natal-house-line");
        layer.appendChild(line);

        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", Math.cos(angleRad) * labelRadius);
        label.setAttribute("y", Math.sin(angleRad) * labelRadius);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "central");
        label.setAttribute("class", "natal-house-label");
        label.textContent = String(house.house);
        layer.appendChild(label);
    });
}

function renderNatalAspectLayer(chart) {
    const layer = document.getElementById('aspects-layer');
    const visualPlanetIds = new Set(PLANETS.map((planet) => planet.id));
    const aspects = Array.isArray(chart?.aspects)
        ? chart.aspects.filter((aspect) => (
            visualPlanetIds.has(aspect.planetA) && visualPlanetIds.has(aspect.planetB)
        )).slice(0, 8)
        : [];

    if (!layer || !aspects.length) return;

    aspects.forEach((aspect) => {
        const planetA = chart.planets?.[aspect.planetA];
        const planetB = chart.planets?.[aspect.planetB];
        const from = getPlanetVisualPoint(aspect.planetA, planetA?.longitude);
        const to = getPlanetVisualPoint(aspect.planetB, planetB?.longitude);
        if (!from || !to) return;

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.setAttribute("class", `natal-aspect-line natal-aspect-line--${aspect.polarity || 'neutral'}`);

        const title = document.createElementNS(SVG_NS, "title");
        title.textContent = formatAspectSummary(aspect);
        line.appendChild(title);

        layer.appendChild(line);

        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", (from.x + to.x) / 2);
        label.setAttribute("y", (from.y + to.y) / 2);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "central");
        label.setAttribute("class", `natal-aspect-label natal-aspect-label--${aspect.polarity || 'neutral'}`);
        label.textContent = `${ASPECT_SHORT_LABELS[aspect.aspect] || aspect.name} ${aspect.orb}°`;
        layer.appendChild(label);
    });
}

function renderNatalComputedLayers(chart) {
    clearNatalComputedLayers();
    if (!chart?.planets) return;
    renderNatalHouseLayer(chart);
    renderNatalAspectLayer(chart);
}

async function fetchCalculatedNatalChart({ birthDate, birthTime, birthPlace, name }) {
    const params = new URLSearchParams({
        birthDate,
        birthTime: birthTime || '',
        birthPlace: birthPlace || '',
        name: name || ''
    });
    const apiBase = window.API_CONFIG?.BASE_URL || '/api';
    const response = await fetch(`${apiBase}/natal-chart/calculate?${params.toString()}`, {
        credentials: 'include'
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || `Natal calculation failed: ${response.status}`);
    }

    return data.chart;
}

function formatCalculatedPlanet(planet) {
    if (!planet?.sign?.name) return '';
    return `${planet.sign.name} ${planet.degreeText || ''}`.trim();
}

function formatAspectSummary(aspect) {
    if (!aspect) return '';
    const orb = typeof aspect.orb === 'number' ? `, orb ${aspect.orb}°` : '';
    return `${aspect.planetALabel} ${aspect.name.toLowerCase()} ${aspect.planetBLabel}${orb}`;
}

function formatPlanetPlacement(planet) {
    if (!planet) return '';

    const house = typeof planet.house === 'number' ? `, ${planet.house}. dům` : '';
    const retrograde = planet.retrograde ? ' R' : '';
    return `${planet.name}: ${planet.sign?.name || '--'} ${planet.degreeText || ''}${retrograde}${house}`.trim();
}

function renderNatalEngineSummary(chart) {
    const elementValue = document.getElementById('natal-element-value');
    const qualityValue = document.getElementById('natal-quality-value');
    const planetsList = document.getElementById('natal-planets-list');
    const aspectsList = document.getElementById('natal-aspects-list');
    const note = document.getElementById('natal-engine-note');

    if (elementValue) {
        elementValue.textContent = chart.elementBalance?.dominant?.label || '--';
    }
    if (qualityValue) {
        qualityValue.textContent = chart.qualityBalance?.dominant?.label || '--';
    }
    if (planetsList) {
        planetsList.innerHTML = '';
        const planets = NATAL_PLANET_ORDER
            .map((planetId) => chart.planets?.[planetId])
            .filter(Boolean);

        planets.forEach((planet) => {
            const item = document.createElement('li');
            item.textContent = formatPlanetPlacement(planet);
            planetsList.appendChild(item);
        });
    }
    if (aspectsList) {
        aspectsList.innerHTML = '';
        const aspects = Array.isArray(chart.aspects) ? chart.aspects.slice(0, 3) : [];

        if (!aspects.length) {
            const item = document.createElement('li');
            item.textContent = 'Bez hlavních aspektů v nastaveném orbu.';
            aspectsList.appendChild(item);
        } else {
            aspects.forEach((aspect) => {
                const item = document.createElement('li');
                item.textContent = formatAspectSummary(aspect);
                aspectsList.appendChild(item);
            });
        }
    }
    if (note) {
        note.textContent = chart.houses?.available
            ? `Ascendent a domy: ${chart.houses.system === 'whole_sign' ? 'whole-sign' : chart.houses.system}.`
            : (chart.houses?.reason || 'Ascendent vyžaduje přesný čas a rozpoznané místo narození.');
    }
}

function trackNatalCalculation(chart, input = {}) {
    window.MH_ANALYTICS?.trackEvent?.('natal_chart_calculated', {
        engine_version: chart?.engine?.version || null,
        precision: chart?.engine?.precision || null,
        has_birth_time: Boolean(input.birthTime),
        has_birth_place: Boolean(input.birthPlace),
        location_resolved: Boolean(chart?.location),
        ascendant_available: Boolean(chart?.houses?.available),
        dominant_element: chart?.elementBalance?.dominant?.key || null
    });
}

function applyComputedNatalChart(chart) {
    if (!chart?.planets) return false;

    const sun = formatCalculatedPlanet(chart.planets.sun);
    const moon = formatCalculatedPlanet(chart.planets.moon);
    const ascendant = chart.houses?.ascendant
        ? formatCalculatedPlanet(chart.houses.ascendant)
        : 'bez přesné polohy';

    const sunElement = document.getElementById('res-sun');
    const moonElement = document.getElementById('res-moon');
    const ascElement = document.getElementById('res-asc');
    const tipElement = document.getElementById('tip-sign');

    if (sun && sunElement) {
        sunElement.textContent = sun;
        if (tipElement) tipElement.textContent = chart.planets.sun.sign.name;
    }
    if (moon && moonElement) {
        moonElement.textContent = moon;
    }
    if (ascElement) {
        ascElement.textContent = ascendant;
    }

    renderNatalEngineSummary(chart);

    return true;
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
    clearNatalComputedLayers();
    setBlockVisible(document.getElementById('chart-results'), false);

    // Get or create AI results container
    let aiResultsDiv = document.getElementById('ai-interpretation');
    if (!aiResultsDiv) {
        aiResultsDiv = createAIResultsContainer();
    }
    setBlockVisible(aiResultsDiv, false);

    try {
        // Generate server-calculated positions for the public chart visual.
        const seed = name.length + birthDate.length;
        let computedChart = null;
        try {
            computedChart = await fetchCalculatedNatalChart({ birthDate, birthTime, birthPlace, name });
            trackNatalCalculation(computedChart, { birthTime, birthPlace });
        } catch (calcError) {
            console.warn('Natal engine calculation fallback:', calcError.message);
        }
        generatePlanets(planetsGroup, seed, computedChart?.planets);
        renderNatalComputedLayers(computedChart);

        // Update 3D Chart
        if (window.Natal3DInstance) {
            const container = document.getElementById('natal-3d-container');
            setBlockVisible(container, true);
            window.Natal3DInstance.onWindowResize(); // Force resize since it was hidden
            window.Natal3DInstance.updatePlanets(seed);
        }

        // Calculate sign positions for display
        // Calculate REAL zodiac sign based on date
        const dateObj = new Date(`${birthDate}T${birthTime || '12:00'}`);
        const sunSignResult = getZodiacSign(dateObj);

        // Update Transits (Phase 2)
        if (typeof updateTransits === 'function') {
            updateTransits({ birthDate, birthTime, birthPlace, name });
        }

        // Show basic results (Text)
        if (!applyComputedNatalChart(computedChart)) {
            const sunSign = sunSignResult || getSignFromAngle((seed * 37) % 360);
            document.getElementById('res-sun').textContent = `${sunSign.name}`;
            document.getElementById('tip-sign').textContent = sunSign.name;
        }
        setBlockVisible(document.getElementById('chart-results'), true);

        // Call AI for interpretation
        btn.innerHTML = '<span class="loading-spinner"></span> Navazuji spojení s hvězdami...';

        // Calculate Sun Sign locally for prompt accuracy
        const birthDateObj = new Date(birthDate);
        const localSunSign = getZodiacSign(birthDateObj)?.name || '';

        // Login required for AI interpretation (chart graphic stays public)
        if (!window.Auth || !window.Auth.isLoggedIn()) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            setBlockVisible(aiResultsDiv, true);
            const contentDiv = aiResultsDiv.querySelector('.ai-content');
            if (window.Premium) {
                window.Premium.showLoginGate(
                    contentDiv,
                    '\u2B50 Vytvo\u0159te \u00FA\u010Det a pokra\u010Dujte k odem\u010Den\u00ED sv\u00E9ho vesm\u00EDrn\u00E9ho pl\u00E1nu',
                    'natalni_interpretace',
                    'natal_teaser_gate'
                );
            }
            return;
        }

        // Premium required for AI interpretation
        if (!window.Auth.isPremium()) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            if (window.Premium?.showTrialPaywall) {
                window.Premium.showTrialPaywall('natalni_interpretace');
            }
            return;
        }

        // Call API via centralized helper
        const data = await window.callAPI('/natal-chart', {
            birthDate,
            birthTime,
            birthPlace,
            name,
            sunSign: localSunSign // Send to AI for consistency
        });

        if (data.success || data.response) {
            const finalChart = data.chart || computedChart;
            applyComputedNatalChart(finalChart);
            renderNatalComputedLayers(finalChart);

            // Display AI interpretation
            setBlockVisible(aiResultsDiv, true);
            const contentDiv = aiResultsDiv.querySelector('.ai-content');
            
            // Clean and format the response
            const responseText = data.response || data.message || '';
            
            // Safer cleaning: remove <html>, <body>, <head>, <script>, <style> only
            let cleanContent = responseText.replace(/<\/?(html|body|head|script|style)[^>]*>/gi, '');
            const textToSearch = cleanContent.replace(/<[^>]+>/g, ' ');

            // Ensure our specific structure is preserved and enhanced
            let formattedContent = cleanContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>')
                // If it doesn't already have H4/P tags, wrap it (handle mixed content)
                .split('\n\n').map(para => {
                    if (para.trim().startsWith('<h4')) return para;
                    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
                }).join('');

            contentDiv.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(formattedContent) : formattedContent;
            
            // --- STRUCTURED DATA EXTRACTION ---
            // Look for "DATA: Slunce=..., Měsíc=..., Ascendent=..."
            const dataMatch = responseText.match(/DATA:\s*Slunce=([^,]+),\s*Měsíc=([^,]+),\s*Ascendent=([^|\n\r]+)/i);
            
            if (dataMatch) {
                // We have clean data from AI
                const moonSignAI = dataMatch[2].trim();
                const ascSignAI = dataMatch[3].trim();
                
                document.getElementById('res-moon').textContent = moonSignAI;
                document.getElementById('res-asc').textContent = ascSignAI;
                
                // Remove the DATA block from visible content (sanitized)
                const cleaned = contentDiv.innerHTML.replace(/DATA:\s*Slunce=[^<]+/i, '').replace(/<p><\/p>/g, '');
                contentDiv.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(cleaned) : cleaned;
            } else {
                // Fallback to strict sign names search in text if DATA block is missing
                const signNames = ZODIAC_SIGNS.map(s => s.name).join('|');
                const moonRegex = new RegExp(`(?:Měsíc|Luna)\\s+(?:ve|v)\\s+(?:znamení\\s+)?(${signNames})`, 'i');
                const moonMatch = textToSearch.match(moonRegex);
                if (moonMatch && moonMatch[1]) {
                    document.getElementById('res-moon').textContent = moonMatch[1];
                }

                const ascRegex = new RegExp(`(?:Ascendent|Vycházející\\s+znamení)\\s+(?:je|v)\\s+(${signNames})`, 'i');
                const ascMatch = textToSearch.match(ascRegex);
                if (ascMatch && ascMatch[1]) {
                    document.getElementById('res-asc').textContent = ascMatch[1];
                }
            }
            
            // Handle Teaser for non-premium
            if (data.isTeaser) {
                const teaserMsg = document.createElement('div');
                teaserMsg.className = 'teaser-overlay';
                teaserMsg.innerHTML = `
                    <div class="teaser-content">
                        <p>✨ Chcete odemknout svůj úplný osud?</p>
                        <a href="${buildNatalUpgradeUrl('natal_teaser_gate')}" class="btn btn--premium natal-teaser-upgrade-btn">Získat Premium</a>
                    </div>
                `;
                contentDiv.appendChild(teaserMsg);
                teaserMsg.querySelector('.natal-teaser-upgrade-btn')?.addEventListener('click', (event) => {
                    event.preventDefault();
                    startNatalUpgradeFlow('natal_teaser_gate');
                });
            }

            // Save to history if logged in and add favorite button
            if (!data.isTeaser && window.Auth && window.Auth.saveReading) {
                const saveResult = await window.Auth.saveReading('natal-chart', {
                    name,
                    birthDate,
                    birthTime,
                    birthPlace,
                    interpretation: data.response,
                    chart: data.chart || computedChart
                });

                // Store reading ID and add favorite button
                if (saveResult && saveResult.id) {
                    window.currentNatalChartReadingId = saveResult.id;

                    // Add favorite button after interpretation
                    const favoriteBtn = document.createElement('div');
                    favoriteBtn.className = 'text-center favorite-reading-action';
                    favoriteBtn.innerHTML = `
                        <button id="favorite-natal-btn" class="btn btn--glass favorite-reading-action__button">
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
        setBlockVisible(aiResultsDiv, true);
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
    container.className = 'natal-ai';
    container.innerHTML = `
        <h4 class="natal-ai__title">
            ✨ Váš osobní hvězdný příběh
        </h4>
        <div class="ai-content natal-ai__content"></div>
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
    element.classList.add('content-fade-enter');
    element.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlContent) : htmlContent;

    // Small delay to ensure DOM update
    await new Promise(r => setTimeout(r, 100));

    element.classList.add('content-fade-enter-active');

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


function renderTransitSnapshot(transit) {
    const section = document.getElementById('transits-now');
    if (!section) return;

    const now = transit?.engine?.calculatedAt ? new Date(transit.engine.calculatedAt) : new Date();

    document.getElementById('transit-date').textContent = now.toLocaleDateString('cs-CZ');
    document.getElementById('transit-title').textContent = transit?.title || `Slunce ve znamení ${transit?.current?.sunSign || '...'}`;
    document.getElementById('transit-subtitle').textContent = transit?.subtitle || 'aktuální tranzity';
    document.getElementById('transit-message').textContent = transit?.message || 'Aktuální tranzity se nepodařilo načíst.';

    setBlockVisible(section, true);
}

async function updateTransits({ birthDate, birthTime, birthPlace, name }) {
    const section = document.getElementById('transits-now');
    if (!section) return;

    try {
        const params = new URLSearchParams({
            birthDate,
            birthTime: birthTime || '',
            birthPlace: birthPlace || '',
            name: name || ''
        });
        const apiBase = window.API_CONFIG?.BASE_URL || '/api';
        const response = await fetch(`${apiBase}/transits/current?${params.toString()}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || `Transit calculation failed: ${response.status}`);
        }

        renderTransitSnapshot(data.transit);
        return;
    } catch (transitError) {
        console.warn('Transit engine fallback:', transitError.message);
    }

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
    document.getElementById('transit-message').textContent = message.replace(/<[^>]*>/g, '');

    setBlockVisible(section, true);
}
