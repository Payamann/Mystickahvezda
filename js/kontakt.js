
        document.addEventListener('DOMContentLoaded', () => {

            const contactForm = document.getElementById('contact-form');

            if (!contactForm) return;



            contactForm.addEventListener('submit', async (e) => {

                e.preventDefault();



                const name = document.getElementById('contact-name').value;

                const email = document.getElementById('contact-email').value;

                const subject = document.getElementById('contact-subject').value;

                const message = document.getElementById('contact-message').value;



                const submitBtn = contactForm.querySelector('button[type="submit"]');

                const originalText = submitBtn.textContent;

                submitBtn.textContent = 'Odesílám...';

                submitBtn.disabled = true;



                try {

                    const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                    const response = await fetch('/api/contact', {

                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json',
                            ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                        },

                        body: JSON.stringify({ name, email, subject, message })

                    });



                    const data = await response.json();



                    if (data.success) {

                        alert(data.message || 'Zpráva byla odeslána!');

                        contactForm.reset();

                    } else {

                        alert(data.error || 'Chyba při odesílání zprávy.');

                    }

                } catch (error) {

                    console.error('Contact Form Error:', error);

                    alert('Chyba při odesílání zprávy. Zkuste to prosím později.');

                } finally {

                    submitBtn.textContent = originalText;

                    submitBtn.disabled = false;

                }

            });

        });
