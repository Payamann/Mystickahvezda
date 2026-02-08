/**
 * FOMO Live Activity Feed
 * Shows recent user activity to create social proof and urgency
 */

(function () {
    // Expanded dataset for more variety
    const fomoData = [
        // Ženy
        { name: 'Jana', city: 'Praha', action: 'získala výklad vztahů' },
        { name: 'Lenka', city: 'Brno', action: 'objevila svou natální kartu' },
        { name: 'Marie', city: 'Ostrava', action: 'právě si přečetla denní horoskop' },
        { name: 'Eva', city: 'Plzeň', action: 'se ptá Mentora na lásku' },
        { name: 'Hana', city: 'Liberec', action: 'vyložila si tarotové karty' },
        { name: 'Anna', city: 'Olomouc', action: 'zkouší Premium verzi zdarma' },
        { name: 'Zuzana', city: 'České Budějovice', action: 'objevila partnerskou shodu' },
        { name: 'Kateřina', city: 'Hradec Králové', action: 'analyzuje svou numerologii' },
        { name: 'Lucie', city: 'Pardubice', action: 'právě se zaregistrovala' },
        { name: 'Barbora', city: 'Ústí nad Labem', action: 'našla své životní číslo' },
        { name: 'Veronika', city: 'Zlín', action: 'zkoumá astrokartografii' },
        { name: 'Alena', city: 'Havířov', action: 'se ptá křištálové koule' },
        { name: 'Petra', city: 'Kladno', action: 'zjistila svůj ascendent' },
        { name: 'Michaela', city: 'Most', action: 'čte týdenní předpověď' },
        { name: 'Tereza', city: 'Opava', action: 'sdílí svůj horoskop' },
        { name: 'Markéta', city: 'Frýdek-Místek', action: 'vyložila kartu dne' },
        { name: 'Kristýna', city: 'Karviná', action: 'se spojila se svým průvodcem' },
        { name: 'Simona', city: 'Jihlava', action: 'oslavuje své znamení' },
        { name: 'Nikola', city: 'Teplice', action: 'odeslala dotaz astrologovi' },
        { name: 'Klára', city: 'Děčín', action: 'upgradovala na Premium' },
        { name: 'Eliška', city: 'Karlovy Vary', action: 'studuje postavení planet' },
        { name: 'Adéla', city: 'Chomutov', action: 'našla odpověď v orákulu' },
        { name: 'Daniela', city: 'Jablonec', action: 'porovnává shodu s partnerem' },
        { name: 'Karolína', city: 'Mladá Boleslav', action: 'objevila svůj měsíční úzus' },
        { name: 'Pavla', city: 'Prostějov', action: 'čte charakteristiku svého znamení' },

        // Muži
        { name: 'Petr', city: 'Praha', action: 'získal výklad vztahů' },
        { name: 'Jan', city: 'Brno', action: 'objevil svou natální kartu' },
        { name: 'Jiří', city: 'Ostrava', action: 'právě si přečetl denní horoskop' },
        { name: 'Pavel', city: 'Plzeň', action: 'se ptá Mentora na kariéru' },
        { name: 'Tomáš', city: 'Liberec', action: 'zkouší Premium verzi' },
        { name: 'Martin', city: 'Olomouc', action: 'vyložil si tarotové karty' },
        { name: 'Jaroslav', city: 'České Budějovice', action: 'analyzuje svou numerologii' },
        { name: 'Josef', city: 'Hradec Králové', action: 'právě se zaregistroval' },
        { name: 'Miroslav', city: 'Pardubice', action: 'objevil partnerskou shodu' },
        { name: 'Zdeněk', city: 'Ústí nad Labem', action: 'upgradoval na Premium' },
        { name: 'Václav', city: 'Zlín', action: 'zkoumá astrokartografii' },
        { name: 'Michal', city: 'Havířov', action: 'našel své životní číslo' },
        { name: 'František', city: 'Kladno', action: 'zjistil svůj ascendent' },
        { name: 'Jakub', city: 'Most', action: 'čte týdenní předpověď' },
        { name: 'Milan', city: 'Opava', action: 'vyložil kartu dne' },
        { name: 'Karel', city: 'Frýdek-Místek', action: 'se ptá křištálové koule' },
        { name: 'David', city: 'Karviná', action: 'studuje postavení planet' },
        { name: 'Vladimír', city: 'Jihlava', action: 'odeslala dotaz astrologovi' },
        { name: 'Lukáš', city: 'Teplice', action: 'oslavuje své znamení' },
        { name: 'Ladislav', city: 'Děčín', action: 'našel odpověď v orákulu' },
        { name: 'Stanislav', city: 'Karlovy Vary', action: 'porovnává shodu s partnerkou' },
        { name: 'Ondřej', city: 'Chomutov', action: 'objevuje vliv měsíce' },
        { name: 'Marek', city: 'Jablonec', action: 'čte roční horoskop' },
        { name: 'Roman', city: 'Mladá Boleslav', action: 'se spojil se svým průvodcem' },
        { name: 'Filip', city: 'Prostějov', action: 'zkouší výklad snů' }
    ];

    // Shuffle array to ensure randomness on every load
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Shuffle initially
    shuffleArray(fomoData);

    let currentIndex = 0;
    let isVisible = false;

    function createNotification(data) {
        const notification = document.createElement('div');
        notification.className = 'fomo-notification';
        notification.innerHTML = `
      <div class="fomo-icon">✨</div>
      <div class="fomo-content">
        <div class="fomo-text">${data.name} z ${data.city}</div>
        <div class="fomo-action">${data.action}</div>
      </div>
    `;
        return notification;
    }

    function showNotification() {
        const container = document.getElementById('fomo-container');
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Create new notification
        const notification = createNotification(fomoData[currentIndex]);
        container.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
            isVisible = true;
        }, 100);

        // Hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            isVisible = false;
        }, 5000);

        // Next notification
        currentIndex = (currentIndex + 1) % fomoData.length;
    }

    function scheduleNextNotification() {
        // Random delay between 60s (60000ms) and 90s (90000ms)
        const minDelay = 60000;
        const maxDelay = 90000;
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        setTimeout(() => {
            if (!isVisible) {
                showNotification();
            }
            // Schedule the next one recursively
            scheduleNextNotification();
        }, randomDelay);
    }

    function init() {
        // Don't show on mobile (would overlap with bottom nav)
        if (window.innerWidth < 768) return;

        // First notification after random delay 15-30s so it doesn't pop immediately
        const firstDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;

        setTimeout(() => {
            showNotification();
            // Start the regular cycle
            scheduleNextNotification();
        }, firstDelay);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
