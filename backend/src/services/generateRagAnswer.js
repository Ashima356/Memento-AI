
const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

async function generateRagAnswer(query, memories) {
    let response;

    try {
        response = await fetch(`${AI_SERVICE_URL}/answer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                memories,
            }),
            signal: AbortSignal.timeout(90000),
        });
    } catch (error) {
        if (error.name === "TimeoutError" ||
            error.name === "AbortError") {
            throw new Error("AI service request timed out.");
        }

        throw new Error(
            `Could not reach the AI service: ${error.message}`
        );
    }

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `AI service returned HTTP ${response.status}: ${errorText}`
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("AI service returned invalid JSON.");
    }

    if (
        typeof result.answer !== "string" ||
        !result.answer.trim()
    ) {
        throw new Error("AI service returned an invalid answer.");
    }

    return result;
}

module.exports = generateRagAnswer;
