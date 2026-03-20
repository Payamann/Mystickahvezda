        document.addEventListener('DOMContentLoaded', () => {
            // FAQ Accordion
            document.querySelectorAll('.faq-question').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = btn.closest('.faq-item');
                    const isOpen = item.classList.contains('open');
                    document.querySelectorAll('.faq-item.open').forEach(i => {
                        i.classList.remove('open');
                        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    });
                    if (!isOpen) {
                        item.classList.add('open');
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });
            });

            // Sen Dne — wired via globalDreamsData poll
            function initDreamOfDay(dreams) {
                if (!dreams || !dreams.length) return;
                const countEl = document.getElementById('symbol-count');
                if (countEl) countEl.textContent = dreams.length + '+';
                const todayDream = dreams[Math.floor(Date.now() / 86400000) % dreams.length];
                showDreamOfDay(todayDream);
            }

            function showDreamOfDay(d) {
                const e = document.getElementById('dod-emoji');
                const k = document.getElementById('dod-keyword');
                const desc = document.getElementById('dod-desc');
                if (e) e.textContent = d.emoji || '✨';
                if (k) k.textContent = d.keyword;
                if (desc) desc.textContent = d.description;
            }

            let _pc = 0;
            const _pi = setInterval(() => {
                if (window.globalDreamsData && window.globalDreamsData.length) {
                    clearInterval(_pi);
                    initDreamOfDay(window.globalDreamsData);
                } else if (++_pc > 40) clearInterval(_pi);
            }, 150);
        });
