
const Memory = require("../../models/Memory");
const generateEmbedding = require("../embeddings/generateEmbedding");

// Configurable threshold: cosine similarity ranges from -1 to 1.
const configuredThreshold = Number(
    process.env.MEMORY_SIMILARITY_THRESHOLD
);

const MIN_SIMILARITY =
    Number.isFinite(configuredThreshold) &&
    configuredThreshold >= -1 &&
    configuredThreshold <= 1
        ? configuredThreshold
        : 0.30;

// Embeddings are normalized, so their dot product gives cosine similarity.
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0) {
        return -1;
    }

    let score = 0;

    for (let i = 0; i < a.length; i++) {
        score += a[i] * b[i];
    }

    return score;
}

async function searchMemories(query, limit = 5) {
    const queryEmbedding = await generateEmbedding(query);

    const memories = await Memory.find({
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
        // Discard weak matches before ranking and limiting.
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
