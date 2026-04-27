const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../data/angel-cards.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const cards = JSON.parse(rawData);

// Archetype keywords to match by theme or name
const archetypes = {
    love: ['lásk', 'romantik', 'vztah', 'přátelství', 'harmonie', 'odpuštění'],
    healing: ['uzdravení', 'zdraví', 'rafael'],
    abundance: ['hojnost', 'prosperit', 'bohatství', 'zázrak', 'vděčnost', 'ariel'],
    guidance: ['moudrost', 'vnuknutí', 'vedení', 'intuic', 'pravd', 'uriel', 'gabriel'],
    strength: ['síla', 'odvah', 'ochran', 'michael', 'hrdinství'],
    peace: ['mír', 'klid', 'útěcha', 'radost', 'trpělivost', 'chamuel', 'azrael', 'milost', 'naděje'],
    nature: ['přírod', 'krása', 'jofiel', 'rovnováha', 'přítomnost'],
    purpose: ['poslání', 'smysl', 'cesta', 'osud', 'začátk', 'metatron']
};

cards.forEach(card => {
    let assigned = false;
    const searchString = (card.theme + ' ' + card.name).toLowerCase();

    for (const [archetype, keywords] of Object.entries(archetypes)) {
        if (keywords.some(kw => searchString.includes(kw))) {
            card.archetype = archetype;
            assigned = true;
            break;
        }
    }

    // Fallback based on ID if theme didn't catch it
    if (!assigned) {
        if (card.id.includes('love') || card.id.includes('romance') || card.id.includes('friendship') || card.id.includes('forgiveness')) card.archetype = 'love';
        else if (card.id.includes('healing') || card.id.includes('health') || card.id.includes('raphael')) card.archetype = 'healing';
        else if (card.id.includes('abundance') || card.id.includes('wealth') || card.id.includes('ariel')) card.archetype = 'abundance';
        else if (card.id.includes('guidance') || card.id.includes('truth') || card.id.includes('intuition') || card.id.includes('gabriel') || card.id.includes('uriel')) card.archetype = 'guidance';
        else if (card.id.includes('strength') || card.id.includes('courage') || card.id.includes('michael')) card.archetype = 'strength';
        else if (card.id.includes('peace') || card.id.includes('joy') || card.id.includes('patience') || card.id.includes('hope') || card.id.includes('grace')) card.archetype = 'peace';
        else if (card.id.includes('nature') || card.id.includes('balance') || card.id.includes('presence')) card.archetype = 'nature';
        else if (card.id.includes('purpose') || card.id.includes('destiny') || card.id.includes('new_beginnings') || card.id.includes('focus') || card.id.includes('learning')) card.archetype = 'purpose';
        else card.archetype = 'guidance'; // default fallback
    }
});

fs.writeFileSync(filePath, JSON.stringify(cards, null, 4), 'utf8');
console.log('Archetypes successfully assigned to all ' + cards.length + ' cards!');
