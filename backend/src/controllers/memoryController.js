
const Memory = require("../models/Memory");
const Person = require("../models/Person");
const generateEmbedding = require("../services/embeddings/generateEmbedding");
const searchMemories = require("../services/retrieval/searchMemories");
const generateRagAnswer = require("../services/generateRagAnswer");

// Create a memory and generate its embedding
const createMemory = async (req, res) => {
    try {
        const { personId, title, description, date, tags } = req.body;
        const userId = req.user.userId;

        if (
            !personId ||
            typeof title !== "string" ||
            !title.trim() ||
            typeof description !== "string" ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: "personId, title, and description are required."
            });
        }

        // Verify that the person belongs to the logged-in user
        const person = await Person.findOne({
            _id: personId,
            userId
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        const text = `${title.trim()}\n${description.trim()}`;
        const embedding = await generateEmbedding(text);

        const memory = await Memory.create({
            personId,
            userId,
            title: title.trim(),
            description: description.trim(),
            date,
            tags,
            embedding
        });

        // Exclude embedding from the API response
        const memoryResponse = memory.toObject();
        delete memoryResponse.embedding;

        return res.status(201).json(memoryResponse);

    } catch (error) {
        console.error("Create memory error:", error.message);

        return res.status(500).json({
            message: "Failed to create memory."
        });
    }
};

// Get all memories belonging to the logged-in user
const getMemories = async (req, res) => {
    try {
        const memories = await Memory.find({
            userId: req.user.userId
        })
            .select("-embedding")
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
        const memory = await Memory.findOne({
            _id: req.params.id,
            userId: req.user.userId
        })
            .select("-embedding")
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
        const existingMemory = await Memory.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!existingMemory) {
            return res.status(404).json({
                message: "Memory not found"
            });
        }

        const { title, description, date, tags, personId } = req.body;

        // If changing the associated person, verify ownership
        if (personId !== undefined) {
            const person = await Person.findOne({
                _id: personId,
                userId: req.user.userId
            });

            if (!person) {
                return res.status(404).json({
                    message: "Person not found"
                });
            }

            existingMemory.personId = personId;
        }

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({
                    message: "Title must be a non-empty string."
                });
            }

            existingMemory.title = title.trim();
        }

        if (description !== undefined) {
            if (
                typeof description !== "string" ||
                !description.trim()
            ) {
                return res.status(400).json({
                    message: "Description must be a non-empty string."
                });
            }

            existingMemory.description = description.trim();
        }

        if (date !== undefined) {
            existingMemory.date = date;
        }

        if (tags !== undefined) {
            existingMemory.tags = tags;
        }

        // Regenerate embedding if title or description changes
        if (title !== undefined || description !== undefined) {
            const text =
                `${existingMemory.title.trim()}\n${existingMemory.description.trim()}`;

            existingMemory.embedding = await generateEmbedding(text);
        }

        await existingMemory.save();

        await existingMemory.populate("personId", "name relationship");

        // Exclude embedding from the API response
        const memoryResponse = existingMemory.toObject();
        delete memoryResponse.embedding;

        return res.status(200).json(memoryResponse);

    } catch (error) {
        console.error("Update memory error:", error.message);

        return res.status(500).json({
            message: "Failed to update memory."
        });
    }
};

// Delete a memory
const deleteMemory = async (req, res) => {
    try {
        const memory = await Memory.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });

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

// Semantic memory search
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
            parsedLimit,
            req.user.userId
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

// Gemini-powered RAG question answering
async function askMemoryController(req, res) {
    try {
        const { query, limit = 5 } = req.body;

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                message: "A non-empty query is required."
            });
        }

        const parsedLimit = Number(limit);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 10
        ) {
            return res.status(400).json({
                message: "Limit must be an integer between 1 and 10."
            });
        }

        const normalizedQuery = query.trim();

        // Retrieve only this user's relevant memories
        const memories = await searchMemories(
            normalizedQuery,
            parsedLimit,
            req.user.userId
        );

        if (memories.length === 0) {
            return res.status(200).json({
                query: normalizedQuery,
                answer:
                    "I couldn't find a relevant memory to answer that question. You may need to add more details.",
                memories_used: 0,
                sources: []
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
                similarity: memory.similarity
            }))
        });

    } catch (error) {
        console.error("Ask memory error:", error.message);

        return res.status(502).json({
            message:
                "Unable to generate an answer from memories. Please try again later."
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
    askMemoryController
};
