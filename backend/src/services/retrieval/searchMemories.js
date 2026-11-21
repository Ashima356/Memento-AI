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

// Calculate cosine similarity between two vectors.
function cosineSimilarity(a, b) {
    if (
        !Array.isArray(a) ||
        !Array.isArray(b) ||
        a.length !== b.length ||
        a.length === 0
    ) {
        return -1;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        if (
            !Number.isFinite(a[i]) ||
            !Number.isFinite(b[i])
        ) {
            return -1;
        }

        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
        return -1;
    }

    return dotProduct / (
        Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
    );
}

// Search memories belonging only to the authenticated
// caregiver and the selected patient.
async function searchMemories(query, limit = 5, userId, patientId) {
    if (
        !mongoose.isValidObjectId(userId) ||
        !mongoose.isValidObjectId(patientId)
    ) {
        throw new Error(
            "Valid userId and patientId are required."
        );
    }

    if (
        typeof query !== "string" ||
        !query.trim()
    ) {
        throw new Error("A valid search query is required.");
    }

    const queryEmbedding = await generateEmbedding(query.trim());

    const memories = await Memory.find({
        userId,
        patientId,
        embedding: { $size: 384 },
    })
        // Explicitly retrieve embeddings for internal similarity scoring.
        .select("+embedding")
        .populate("personId", "name relationship");

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

    // Return memory information, never raw embeddings.
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