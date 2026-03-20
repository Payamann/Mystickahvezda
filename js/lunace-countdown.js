(function () {
    const LUNAR_CYCLE = 29.530588853;
    const KNOWN_NEW_MOON = new Date('2026-02-17T12:01:12Z');

    function getNextPhaseDate(targetFraction) {
        const now = new Date();
        const msPerDay = 86400000;
        const age = ((now - KNOWN_NEW_MOON) / msPerDay % LUNAR_CYCLE + LUNAR_CYCLE) % LUNAR_CYCLE;
        let daysUntil = (targetFraction * LUNAR_CYCLE) - age;
        if (daysUntil <= 0.5) daysUntil += LUNAR_CYCLE;
        return new Date(now.getTime() + daysUntil * msPerDay);
    }

    function formatCountdown(target) {
        const diff = target - new Date();
        if (diff <= 0) return 'Dnes!';
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (d > 0) return `Za ${d} dní ${h} h`;
        if (h > 0) return `Za ${h} h ${m} min`;
        return `Za ${m} minut`;
    }

    function updateCountdowns() {
        const nextNew = getNextPhaseDate(0);
        const nextFull = getNextPhaseDate(0.5);
        const fmt = d => d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
        document.getElementById('countdown-new').textContent = formatCountdown(nextNew);
        document.getElementById('countdown-new-date').textContent = fmt(nextNew);
        document.getElementById('countdown-full').textContent = formatCountdown(nextFull);
        document.getElementById('countdown-full-date').textContent = fmt(nextFull);
    }

    updateCountdowns();
    setInterval(updateCountdowns, 60000);
})();
