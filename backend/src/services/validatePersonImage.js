const fs = require("node:fs/promises");

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

async function validatePersonImage(filePath, declaredMimeType) {
    const { fileTypeFromBuffer } = await import("file-type");

    const imageBuffer = await fs.readFile(filePath);
    const detectedType = await fileTypeFromBuffer(imageBuffer);

    if (
        !detectedType ||
        !ALLOWED_TYPES.has(detectedType.mime) ||
        detectedType.mime !== declaredMimeType
    ) {
        throw new Error("Invalid image format or MIME type mismatch.");
    }

    return imageBuffer;
}

module.exports = validatePersonImage;