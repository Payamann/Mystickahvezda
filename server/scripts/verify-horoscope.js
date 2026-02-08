
async function testHoroscope() {
    try {
        const response = await fetch('http://localhost:3001/api/horoscope', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sign: 'Beran',
                period: 'daily'
            })
        });

        const data = await response.json();
        console.log('--- API Response ---');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            let parsed;
            try {
                // If it's already an object, use it; otherwise parse string
                parsed = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;

                console.log('\n--- Parsed Content ---');
                console.log('Prediction:', parsed.prediction);
                console.log('Affirmation:', parsed.affirmation);

                const predLower = parsed.prediction.toLowerCase();
                const affLower = parsed.affirmation ? parsed.affirmation.toLowerCase() : '';

                if (predLower.includes('afirmace:') || (affLower && predLower.includes(affLower))) {
                    console.error('\n❌ FAILURE: Affirmation found in prediction text!');
                } else {
                    console.log('\n✅ SUCCESS: Prediction appears clean.');
                }
            } catch (e) {
                console.log('Response parsing error or simple string:', e.message);
                if (typeof data.response === 'string' && data.response.toLowerCase().includes('afirmace')) {
                    console.error('\n❌ FAILURE: Response is string and contains Affirmation!');
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testHoroscope();
