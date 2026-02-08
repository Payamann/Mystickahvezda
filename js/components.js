/**
 * Mystická Hvězda - Component Loader
 * Dynamically loads Header and Footer to avoid code duplication.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Load header and footer in parallel for faster initial paint
    await Promise.all([
        loadComponent('header-placeholder', 'components/header.html'),
        loadComponent('footer-placeholder', 'components/footer.html')
    ]);

    // Dispatch event to signal that UI shells are ready
    // This allows main.js to attach event listeners to the newly injected elements
    document.dispatchEvent(new Event('components:loaded'));
});

async function loadComponent(elementId, path) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);

        const html = await response.text();
        element.innerHTML = html;

        // Unwrap the content (remove the placeholder div but keep content)
        // Actually, keeping a wrapper is often safer for layout, 
        // but our CSS targets >.container, so let's see. 
        // The components themselves have <header> and <footer> tags.
        // So we will replace the placeholder with the content.
        element.replaceWith(...element.childNodes);

    } catch (error) {
        console.error(`Error loading component ${path}:`, error);
        element.innerHTML = `<div class="error-loading">Failed to load content.</div>`;
    }
}
