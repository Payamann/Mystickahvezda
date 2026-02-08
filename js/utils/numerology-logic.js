export const NUMBER_MEANINGS = {
    1: { title: 'Vůdce', short: 'Nezávislost a odvaha' },
    2: { title: 'Mírotvůrce', short: 'Harmonie a spolupráce' },
    3: { title: 'Tvůrce', short: 'Kreativita a vyjádření' },
    4: { title: 'Stavitel', short: 'Stabilita a organizace' },
    5: { title: 'Dobrodruh', short: 'Svoboda a změna' },
    6: { title: 'Pečovatel', short: 'Láska a odpovědnost' },
    7: { title: 'Hledač', short: 'Moudrost a duchovnost' },
    8: { title: 'Velmoc', short: 'Síla a úspěch' },
    9: { title: 'Humanista', short: 'Soucit a odpuštění' },
    11: { title: 'Osvícený', short: 'Intuice a inspirace' },
    22: { title: 'Mistr stavitel', short: 'Vize a realizace' },
    33: { title: 'Mistr učitel', short: 'Duchovní vedení' }
};

export function reduceToSingleDigit(num, preserveMaster = true) {
    while (num > 9) {
        if (preserveMaster && (num === 11 || num === 22 || num === 33)) {
            return num;
        }
        num = ('' + num).split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return num;
}

export function calculateLifePath(birthDate) {
    if (!birthDate) return 0;
    const [year, month, day] = birthDate.split('-').map(Number);
    if (!year || !month || !day) return 0;

    const daySum = reduceToSingleDigit(day);
    const monthSum = reduceToSingleDigit(month);
    const yearSum = reduceToSingleDigit(year);
    return reduceToSingleDigit(daySum + monthSum + yearSum);
}

export function letterToNumber(letter) {
    const letterMap = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
    };
    // Basic normalization for accents
    const normalized = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return letterMap[normalized.toUpperCase()] || 0;
}

export function calculateDestiny(name) {
    if (!name) return 0;
    const sum = name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalize accents
        .replace(/[^a-zA-Z]/g, '')
        .split('')
        .reduce((total, char) => total + letterToNumber(char), 0);
    return reduceToSingleDigit(sum);
}

export function calculateSoul(name) {
    if (!name) return 0;
    const vowels = 'AEIOUY';
    const sum = name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalize accents
        .toUpperCase()
        .split('')
        .filter(char => vowels.includes(char))
        .reduce((total, char) => total + letterToNumber(char), 0);
    return reduceToSingleDigit(sum);
}

export function calculatePersonality(name) {
    if (!name) return 0;
    const vowels = 'AEIOUY';
    const sum = name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalize accents
        .toUpperCase()
        .split('')
        .filter(char => !vowels.includes(char) && /[A-Z]/.test(char))
        .reduce((total, char) => total + letterToNumber(char), 0);
    return reduceToSingleDigit(sum);
}


export function calculatePersonalCycles(birthDate, targetDate = new Date()) {
    if (!birthDate) return null;
    const [bYear, bMonth, bDay] = birthDate.split('-').map(Number);
    if (!bMonth || !bDay) return null;

    // Current date components
    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth() + 1;
    const currentDay = targetDate.getDate();

    // Personal Year: Day + Month + Current Year
    // reduced to 1-9 (or 11, 22)
    const pyRaw = reduceToSingleDigit(bDay) + reduceToSingleDigit(bMonth) + reduceToSingleDigit(currentYear);
    const personalYear = reduceToSingleDigit(pyRaw, true);

    // Personal Month: Personal Year + Current Month
    const pmRaw = reduceToSingleDigit(personalYear) + reduceToSingleDigit(currentMonth);
    const personalMonth = reduceToSingleDigit(pmRaw, true);

    // Personal Day: Personal Month + Current Day
    const pdRaw = reduceToSingleDigit(personalMonth) + reduceToSingleDigit(currentDay);
    const personalDay = reduceToSingleDigit(pdRaw, true);

    return { personalYear, personalMonth, personalDay };
}
