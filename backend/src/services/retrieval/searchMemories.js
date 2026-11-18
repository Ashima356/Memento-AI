const mongoose = require("mongoose");
const Memory = require("../../models/Memory");
const generateEmbedding = require("../embeddings/generateEmbedding");

const configuredThreshold = Number(
    process.env.MEMORY_SIMILARITY_THRESHOLD
);

const MIN_SIMILARITY =
    Number.isFinite(configuredThreshold) &&
    configuredThreshold >= -1 &&
    configuredThreshold <= 1
        ? configuredThreshold
        : 0.30;

// Normalized embeddings: dot product = cosine similarity
function cosineSimilarity(a, b) {
    if (
        !Array.isArray(a) ||
        !Array.isArray(b) ||
        a.length !== b.length ||
        a.length === 0
    ) {
        return -1;
    }

    let score = 0;

    for (let i = 0; i < a.length; i++) {
        score += a[i] * b[i];
    }

    return score;
}

async function searchMemories(query, limit = 5, userId, patientId) {
    // Never allow an unscoped memory search
    if (
        !mongoose.isValidObjectId(userId) ||
        !mongoose.isValidObjectId(patientId)
    ) {
        throw new Error("Valid userId and patientId are required.");
    }

    const queryEmbedding = await generateEmbedding(query);

    const memories = await Memory.find({
        userId,
        patientId,
        embedding: { $size: 384 },
    }).populate("personId", "name relationship");

    const results = memories
        .map((memory) => ({
            memory,
            score: cosineSimilarity(
                queryEmbedding,
                memory.embedding
            ),
        }))
        .filter(({ score }) => score >= MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return results.map(({ memory, score }) => ({
        _id: memory._id,
        title: memory.title,
        description: memory.description,
        date: memory.date,
        tags: memory.tags,
        person: memory.personId,
        similarity: Number(score.toFixed(4)),
    }));
}

module.exports = searchMemories;