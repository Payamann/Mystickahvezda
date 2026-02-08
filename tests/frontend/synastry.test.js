import { calculateSynastryScores } from '../../js/utils/synastry-logic.js';

describe('Synastry Logic', () => {

    it('should return deterministic scores based on names', () => {
        const input1 = { name: 'Jan', birthDate: '1990-01-01' };
        const input2 = { name: 'Jana', birthDate: '1990-01-01' };

        const scores1 = calculateSynastryScores(input1, input2);
        const scores2 = calculateSynastryScores(input1, input2);

        // Same inputs -> Same output
        expect(scores1).toEqual(scores2);

        // Structure check
        expect(scores1).toHaveProperty('emotion');
        expect(scores1).toHaveProperty('communication');
        expect(scores1).toHaveProperty('passion');
        expect(scores1).toHaveProperty('total');
    });

    it('should return different scores for different names', () => {
        const scores1 = calculateSynastryScores({ name: 'Adam' }, { name: 'Eva' });
        const scores2 = calculateSynastryScores({ name: 'Petr' }, { name: 'Lucie' });

        // Likely different, though collision possible. 
        // Given the simple seed logic (length based), collision is actually high.
        // Adam(4)+Eva(3)=7. Petr(4)+Lucie(5)=9.
        // Different seeds -> different scores.
        expect(scores1).not.toEqual(scores2);
    });

    it('should handle missing data gracefully', () => {
        const scores = calculateSynastryScores({}, {});
        expect(scores.total).toBe(0);
    });
});
