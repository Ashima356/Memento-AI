
require("dotenv").config();

const mongoose = require("mongoose");
const Memory = require("../src/models/Memory");
const generateEmbedding = require("../src/services/embeddings/generateEmbedding");

async function backfillEmbeddings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const memories = await Memory.find({});
        let updated = 0;
        let skipped = 0;

        for (const memory of memories) {
            if (
                Array.isArray(memory.embedding) &&
                memory.embedding.length === 384
            ) {
                skipped++;
                continue;
            }

            const text =
                `${memory.title}\n${memory.description}`.trim();

            memory.embedding = await generateEmbedding(text);
            await memory.save();

            updated++;
            console.log(`Generated embedding for: ${memory.title}`);
        }

        console.log("\nBackfill complete.");
        console.log(`Updated: ${updated}`);
        console.log(`Skipped (already valid): ${skipped}`);
    } catch (error) {
        console.error("Backfill failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

backfillEmbeddings();
