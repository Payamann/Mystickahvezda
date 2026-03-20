document.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (action === 'closeBanner') {
        const banner = document.getElementById('freemium-banner');
        if (banner) banner.style.display = 'none';
    }
});
