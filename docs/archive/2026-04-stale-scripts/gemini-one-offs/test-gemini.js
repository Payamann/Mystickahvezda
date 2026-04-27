
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3-flash-preview';

console.log(`🔑 Testing Gemini API with key: ${API_KEY ? 'Present' : 'Missing'}`);
console.log(`🤖 Model: ${MODEL_NAME}`);

async function testGemini() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: "Hello, what model version are you?" }]
                }]
            })
        });

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status}`);
            const errorText = await response.text();
            console.error(errorText);
            return;
        }

        const data = await response.json();
        console.log('✅ Success! Response:');
        console.log(data.candidates?.[0]?.content?.parts?.[0]?.text);

    } catch (e) {
        console.error('❌ Network/System Error:', e);
    }
}

testGemini();
