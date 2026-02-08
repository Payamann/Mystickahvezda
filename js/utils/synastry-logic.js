export function calculateSynastryScores(person1, person2) {
    // Basic validation
    if (!person1?.name || !person2?.name) {
        return {
            emotion: 0,
            communication: 0,
            passion: 0,
            total: 0
        };
    }

    // Generate deterministic scores for animation based on simple seed
    // (This is the existing placeholders logic, moved here for consistency/testing)
    const seed = person1.name.length + person2.name.length;

    // Ensure scores are within 0-100 range and are deterministic
    const emotionScore = 60 + (seed * 3 % 39);
    const commScore = 60 + (seed * 7 % 39);
    const passionScore = 60 + (seed * 5 % 39);
    const totalScore = Math.floor((emotionScore + commScore + passionScore) / 3);

    return {
        emotion: emotionScore,
        communication: commScore,
        passion: passionScore,
        total: totalScore
    };
}
