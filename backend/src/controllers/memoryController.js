
const Memory = require("../models/Memory");
const Person = require("../models/Person");
const generateEmbedding = require("../services/embeddings/generateEmbedding");
const searchMemories = require("../services/retrieval/searchMemories");
const generateRagAnswer = require("../services/generateRagAnswer");

// Create a memory and generate its embedding
const createMemory = async (req, res) => {
    try {
        const { personId, title, description } = req.body;

        if (!personId || !title || !description) {
            return res.status(400).json({
                message: "personId, title, and description are required."
            });
        }

        const person = await Person.findById(personId);

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        // Generate an embedding from the title and description
        const text = `${title.trim()}\n${description.trim()}`;
        const embedding = await generateEmbedding(text);

        // Save the memory and its embedding in MongoDB
        const memory = await Memory.create({
            ...req.body,
            embedding
        });

        return res.status(201).json(memory);
    } catch (error) {
        console.error("Create memory error:", error.message);

        return res.status(500).json({
            message: "Failed to create memory.",
            error: error.message
        });
    }
};

// Get all memories
const getMemories = async (req, res) => {
    try {
        const memories = await Memory.find()
            .populate("personId", "name relationship");

        return res.status(200).json(memories);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get one memory
const getMemory = async (req, res) => {
    try {
        const memory = await Memory.findById(req.params.id)
            .populate("personId", "name relationship");

        if (!memory) {
            return res.status(404).json({
                message: "Memory not found"
            });
        }

        return res.status(200).json(memory);
    } catch (error) {
        return res.status(400).json({
            message: "Invalid memory ID"
        });
    }
};

// Update a memory

const updateMemory = async (req, res) => {
    try {
        const existingMemory = await Memory.findById(req.params.id);

        if (!existingMemory) {
            return res.status(404).json({
                message: "Memory not found"
            });
        }

        const { title, description } = req.body;

        // Regenerate the embedding if the title or description changes
        if (title !== undefined || description !== undefined) {
            const updatedTitle = title ?? existingMemory.title;
            const updatedDescription =
                description ?? existingMemory.description;

            const text = `${updatedTitle.trim()}\n${updatedDescription.trim()}`;

            req.body.embedding = await generateEmbedding(text);
        }

        const memory = await Memory.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate("personId", "name relationship");

        return res.status(200).json(memory);
    } catch (error) {
        console.error("Update memory error:", error.message);

        return res.status(500).json({
            message: "Failed to update memory.",
            error: error.message
        });
    }
};

// Delete a memory
const deleteMemory = async (req, res) => {
    try {
        const memory = await Memory.findByIdAndDelete(req.params.id);

        if (!memory) {
            return res.status(404).json({
                message: "Memory not found"
            });
        }

        return res.status(200).json({
            message: "Memory deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({
            message: "Invalid memory ID"
        });
    }
};


const searchMemoryController = async (req, res) => {
    try {
        const { query, limit } = req.body;

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                message: "A non-empty query is required."
            });
        }

        const parsedLimit = Number(limit ?? 5);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 20
        ) {
            return res.status(400).json({
                message: "Limit must be an integer between 1 and 20."
            });
        }

        const results = await searchMemories(
            query.trim(),
            parsedLimit
        );

        return res.status(200).json({
            query: query.trim(),
            count: results.length,
            results
        });
    } catch (error) {
        console.error("Memory search error:", error.message);

        return res.status(500).json({
            message: "Memory search failed."
        });
    }
};



async function askMemoryController(req, res) {
    try {
        const { query, limit = 5 } = req.body;

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                message: "A non-empty query is required.",
            });
        }

        const parsedLimit = Number(limit);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 10
        ) {
            return res.status(400).json({
                message: "Limit must be an integer between 1 and 10.",
            });
        }

        const normalizedQuery = query.trim();

        // Retrieve memories that pass the configured similarity threshold.
        const memories = await searchMemories(
            normalizedQuery,
            parsedLimit
        );

        // Avoid calling Gemini when retrieval finds no relevant memories.
        if (memories.length === 0) {
            return res.status(200).json({
                query: normalizedQuery,
                answer:
                    "I couldn't find a relevant memory to answer that question. You may need to add more details.",
                memories_used: 0,
                sources: [],
            });
        }

        const result = await generateRagAnswer(
            normalizedQuery,
            memories
        );

        return res.status(200).json({
            query: normalizedQuery,
            answer: result.answer,
            memories_used: memories.length,
            sources: memories.map((memory) => ({
                id: memory._id,
                title: memory.title,
                person: memory.person,
                similarity: memory.similarity,
            })),
        });
    } catch (error) {
        // Detailed diagnostics stay in the backend logs.
        console.error("Ask memory error:", error.message);

        return res.status(502).json({
            message:
                "Unable to generate an answer from memories. Please try again later.",
        });
    }
}




module.exports = {
    createMemory,
    getMemories,
    getMemory,
    updateMemory,
    deleteMemory,
    searchMemoryController,
    askMemoryController,
};
