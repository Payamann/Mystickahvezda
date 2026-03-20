
        let selectedSign = null;



        function goStep(n) {

            document.querySelectorAll('.step-view').forEach(s => s.classList.remove('active'));

            document.getElementById('step-' + n).classList.add('active');

            // Update progress

            for (let i = 1; i <= 3; i++) {

                const p = document.getElementById('prog-' + i);

                p.classList.toggle('active', i === n);

                p.classList.toggle('done', i < n);

            }

        }



        function selectSign(btn) {

            document.querySelectorAll('.zodiac-btn').forEach(b => b.classList.remove('selected'));

            btn.classList.add('selected');

            selectedSign = btn.dataset.sign;

            const nextBtn = document.getElementById('btn-step2');

            nextBtn.disabled = false;

            nextBtn.style.opacity = '1';

            nextBtn.style.cursor = 'pointer';

        }



        function toggleInterest(btn) {

            btn.classList.toggle('selected');

        }



        async function finishOnboarding() {
            // Save to localStorage for immediate UI updates
            const interests = [...document.querySelectorAll('.interest-chip.selected')].map(c => c.textContent.trim());

            if (selectedSign) localStorage.setItem('mh_zodiac', selectedSign);
            if (interests.length) localStorage.setItem('mh_interests', JSON.stringify(interests));
            localStorage.setItem('mh_onboarded', '1');

            // Also notify backend that onboarding is complete
            try {
                const API_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';
                const res = await fetch(`${API_URL}/auth/onboarding/complete`, {
                    // Send auth cookie automatically with credentials: 'include'
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!res.ok) {
                    console.warn('Failed to notify backend of onboarding completion:', res.status);
                }
            } catch (e) {
                console.warn('Error notifying backend of onboarding:', e);
                // Don't block navigation if backend call fails
            }

            window.location.href = 'index.html';
        }

        // Event delegation - CSP compliance (remove unsafe-inline)
        document.addEventListener('click', function(e) {
            const action = e.target.closest('[data-action]');
            if (!action) return;

            const actionType = action.dataset.action;

            if (actionType === 'goStep') {
                const step = parseInt(action.dataset.step);
                goStep(step);
            } else if (actionType === 'selectSign') {
                selectSign(action);
            } else if (actionType === 'toggleInterest') {
                toggleInterest(action);
            } else if (actionType === 'finishOnboarding') {
                finishOnboarding();
            }
        });
