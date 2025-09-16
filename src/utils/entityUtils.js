// Dictionary of irregulars
const singularMap = {
    quizzes: "quiz",
    notices: "notice",
    games: "game",
};

// Fallback function to singularize
export const toSingular = (entityType) => {
    if (singularMap[entityType]) return singularMap[entityType];

    if (entityType.endsWith("ies")) {
        // e.g. "companies" → "company"
        return entityType.slice(0, -3) + "y";
    }
    if (entityType.endsWith("es")) {
        // e.g. "boxes" → "box"
        return entityType.slice(0, -2);
    }
    if (entityType.endsWith("s")) {
        // e.g. "cars" → "car"
        return entityType.slice(0, -1);
    }
    return entityType; // already singular
};
