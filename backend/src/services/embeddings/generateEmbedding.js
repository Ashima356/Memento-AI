
const AI_SERVICE_URL = "http://127.0.0.1:8000";

async function generateEmbedding(text) {
    const response = await fetch(`${AI_SERVICE_URL}/embed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Embedding service failed (${response.status}): ${errorText}`
        );
    }

    const result = await response.json();

    if (
        !Array.isArray(result.embedding) ||
        result.dimensions !== 384
    ) {
        throw new Error("Invalid embedding response from AI service.");
    }

    return result.embedding;
}

module.exports = generateEmbedding;
