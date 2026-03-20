        // Event delegation for reload button
        document.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action === 'reloadPage') {
                window.location.reload();
            }
        });

        const s = document.getElementById('stars');

        for (let i = 0; i < 80; i++) {

            const el = document.createElement('div');

            el.className = 'star';

            const size = Math.random() * 3 + 1;

            el.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*4}s;animation-delay:${Math.random()*4}s;opacity:${Math.random()*.8}`;

            s.appendChild(el);

        }
