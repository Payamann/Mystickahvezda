import {
    calculateLifePath,
    calculateDestiny,
    calculateSoul,
    calculatePersonality,
    reduceToSingleDigit,
    NUMBER_MEANINGS
} from '../../js/utils/numerology-logic.js';

describe('Numerology Logic', () => {

    describe('calculateLifePath', () => {
        it('should calculate correct life path for standard date', () => {
            // 1990-01-01 -> 1+9+9+0 + 1 + 1 = 21 -> 3? 
            // Logic: day(1) + month(1) + year(1990->19->10->1) = 3
            expect(calculateLifePath('1990-01-01')).toBe(3);
        });

        it('should handle Master Number 33', () => {
            // Example date resulting in 33? 
            // Hard to find generic example without brute force, testing logic directly:
            // reduceToSingleDigit(33) should be 33
            expect(reduceToSingleDigit(33)).toBe(33);
        });
    });

    describe('calculateDestiny (Name)', () => {
        it('should calculate based on all letters', () => {
            // ABC -> 1+2+3 = 6
            expect(calculateDestiny('ABC')).toBe(6);
        });

        it('should ignore spaces and case', () => {
            // a b c -> 6
            expect(calculateDestiny('a b c')).toBe(6);
        });

        it('should handle Czech accents', () => {
            // Áď -> A(1) + D(4) = 5
            expect(calculateDestiny('Áď')).toBe(5);
        });
    });

    describe('calculateSoul (Vowels)', () => {
        it('should count only vowels', () => {
            // ALICE -> A(1) + I(9) + E(5) = 15 -> 6
            expect(calculateSoul('ALICE')).toBe(6);
        });
    });

    describe('calculatePersonality (Consonants)', () => {
        it('should count only consonants', () => {
            // ALICE -> L(3) + C(3) = 6
            expect(calculatePersonality('ALICE')).toBe(6);
        });
    });

    describe('NUMBER_MEANINGS', () => {
        it('should have meanings for 1-9 and master numbers', () => {
            expect(NUMBER_MEANINGS[1]).toBeDefined();
            expect(NUMBER_MEANINGS[9]).toBeDefined();
            expect(NUMBER_MEANINGS[11]).toBeDefined();
            expect(NUMBER_MEANINGS[22]).toBeDefined();
            expect(NUMBER_MEANINGS[33]).toBeDefined();
        });
    });
});
