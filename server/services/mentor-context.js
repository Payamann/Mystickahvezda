const MAX_RECENT_MESSAGES = 4;
const MAX_SUMMARY_MESSAGES = 8;
const MAX_SUMMARY_CHARS = 1200;
const MAX_READING_CONTEXTS = 3;

function compactText(value, maxLength) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function buildCompactMentorHistory(messages = []) {
    const normalized = Array.isArray(messages) ? messages : [];
    const recent = normalized.slice(-MAX_RECENT_MESSAGES);
    const older = normalized.slice(
        Math.max(0, normalized.length - MAX_RECENT_MESSAGES - MAX_SUMMARY_MESSAGES),
        Math.max(0, normalized.length - MAX_RECENT_MESSAGES)
    );

    const summary = older
        .map((message) => {
            const speaker = message.role === 'mentor' || message.role === 'model'
                ? 'Průvodce'
                : 'Uživatel';
            return `${speaker}: ${compactText(message.content, 180)}`;
        })
        .join('\n')
        .slice(0, MAX_SUMMARY_CHARS);

    return { recent, summary };
}

export function buildCompactReadingContext(readings = []) {
    return (Array.isArray(readings) ? readings : [])
        .slice(0, MAX_READING_CONTEXTS)
        .map((reading) => {
            const date = new Date(reading.created_at).toLocaleDateString('cs-CZ');
            const data = reading.data || {};
            let summary = reading.type || 'výklad';

            if (reading.type === 'tarot') {
                const cards = Array.isArray(data.cards) ? data.cards.slice(0, 3) : [];
                summary = `Tarot: ${cards.map((card) => (
                    typeof card === 'object' ? card.name : card
                )).filter(Boolean).join(', ')}`;
            } else if (reading.type === 'crystal-ball') {
                summary = `Křišťálová koule: ${compactText(data.question, 120)}`;
            } else if (reading.type === 'numerology') {
                summary = `Numerologie: životní číslo ${data.lifePath || '?'}, osudové číslo ${data.destiny || '?'}`;
            } else if (reading.type === 'horoscope') {
                summary = `Horoskop: ${compactText(data.sign, 40)} ${compactText(data.period, 40)}`;
            }

            return `[${date}] ${compactText(summary, 220)}`;
        })
        .join('\n');
}
