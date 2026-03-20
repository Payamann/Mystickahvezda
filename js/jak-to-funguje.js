        document.addEventListener('DOMContentLoaded', () => {
            // Initialize Lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }

            // Load header and footer (match index.html pattern)
            const loadComponent = (id, path) => {
                fetch(path)
                    .then(response => response.text())
                    .then(data => {
                        document.getElementById(id).innerHTML = data;
                        if (window.lucide) window.lucide.createIcons();
                    });
            };

            loadComponent('header-placeholder', 'components/header.html');
            loadComponent('footer-placeholder', 'components/footer.html');
        });
