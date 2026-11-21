const FACE_AI_URL =
    process.env.FACE_AI_URL || "http://127.0.0.1:8000";

async function generateFaceEmbedding(imageBuffer, mimeType) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new Error("A valid image buffer is required.");
    }

    if (imageBuffer.length > 5 * 1024 * 1024) {
        throw new Error("Image exceeds the 5 MB limit.");
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(mimeType)) {
        throw new Error("Unsupported image type.");
    }

    const form = new FormData();

    form.append(
        "file",
        new Blob([imageBuffer], { type: mimeType }),
        "person-image"
    );

    const response = await fetch(
        `${FACE_AI_URL}/embeddings`,
        {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Face AI service failed (${response.status}): ${errorText}`
        );
    }

    const result = await response.json();

    if (
        result.dimensions !== 512 ||
        !Array.isArray(result.embedding) ||
        result.embedding.length !== 512 ||
        !result.embedding.every(
            value => typeof value === "number" &&
                     Number.isFinite(value)
        )
    ) {
        throw new Error("Invalid face embedding response.");
    }

    return result.embedding;
}

module.exports = generateFaceEmbedding;