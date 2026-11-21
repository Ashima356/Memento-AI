const mongoose = require("mongoose");

const Memory = require("../models/Memory");
const Person = require("../models/Person");
const Patient = require("../models/Patient");

const generateEmbedding = require("../services/embeddings/generateEmbedding");
const searchMemories = require("../services/retrieval/searchMemories");
const generateRagAnswer = require("../services/generateRagAnswer");

// Verify that the patient belongs to the logged-in caregiver.
async function verifyPatient(patientId, userId) {
    if (
        !mongoose.isValidObjectId(patientId) ||
        !mongoose.isValidObjectId(userId)
    ) {
        return null;
    }

    return Patient.findOne({
        _id: patientId,
        caregiverId: userId,
    });
}

// Create a memory for a person belonging to the selected patient.
const createMemory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            patientId,
            personId,
            title,
            description,
            date,
            tags,
        } = req.body;

        if (
            !mongoose.isValidObjectId(patientId) ||
            !mongoose.isValidObjectId(personId) ||
            typeof title !== "string" ||
            !title.trim() ||
            typeof description !== "string" ||
            !description.trim()
        ) {
            return res.status(400).json({
                message:
                    "Valid patientId, personId, title, and description are required.",
            });
        }

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const person = await Person.findOne({
            _id: personId,
            userId,
            patientId,
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found for this patient.",
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();

        const embedding = await generateEmbedding(
            `${cleanTitle}\n${cleanDescription}`
        );

        const memory = await Memory.create({
            userId,
            patientId,
            personId,
            title: cleanTitle,
            description: cleanDescription,
            date,
            tags,
            embedding,
        });

        const response = memory.toObject();
        delete response.embedding;

        return res.status(201).json(response);
    } catch (error) {
        console.error("Create memory error:", error.message);

        return res.status(500).json({
            message: "Failed to create memory.",
        });
    }
};

// Retrieve memories only for an authorized patient.
const getMemories = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { patientId } = req.query;

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const memories = await Memory.find({
            userId,
            patientId,
        })
            .select("-embedding")
            .populate("personId", "name relationship");

        return res.status(200).json(memories);
    } catch (error) {
        console.error("Get memories error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve memories.",
        });
    }
};

// Retrieve one memory after verifying caregiver ownership.
const getMemory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid memory ID.",
            });
        }

        const memory = await Memory.findOne({
            _id: id,
            userId,
        })
            .select("-embedding")
            .populate("personId", "name relationship");

        if (!memory) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        const patient = await verifyPatient(
            memory.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        return res.status(200).json(memory);
    } catch (error) {
        console.error("Get memory error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve memory.",
        });
    }
};

// Update memory fields without allowing ownership changes.
const updateMemory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid memory ID.",
            });
        }

        const existingMemory = await Memory.findOne({
            _id: id,
            userId,
        });

        if (!existingMemory) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        const patient = await verifyPatient(
            existingMemory.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        const { title, description, date, tags, personId } = req.body;
        const updates = {};

        if (personId !== undefined) {
            if (!mongoose.isValidObjectId(personId)) {
                return res.status(400).json({
                    message: "Invalid personId.",
                });
            }

            const person = await Person.findOne({
                _id: personId,
                userId,
                patientId: existingMemory.patientId,
            });

            if (!person) {
                return res.status(404).json({
                    message: "Person not found for this patient.",
                });
            }

            updates.personId = personId;
        }

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({
                    message: "Title must be a non-empty string.",
                });
            }

            updates.title = title.trim();
        }

        if (description !== undefined) {
            if (
                typeof description !== "string" ||
                !description.trim()
            ) {
                return res.status(400).json({
                    message: "Description must be a non-empty string.",
                });
            }

            updates.description = description.trim();
        }

        if (date !== undefined) {
            updates.date = date;
        }

        if (tags !== undefined) {
            updates.tags = tags;
        }

        // Regenerate the embedding whenever memory text changes.
        if (
            updates.title !== undefined ||
            updates.description !== undefined
        ) {
            const updatedTitle =
                updates.title ?? existingMemory.title;

            const updatedDescription =
                updates.description ?? existingMemory.description;

            updates.embedding = await generateEmbedding(
                `${updatedTitle}\n${updatedDescription}`
            );
        }

        const memory = await Memory.findOneAndUpdate(
            {
                _id: id,
                userId,
                patientId: existingMemory.patientId,
            },
            { $set: updates },
            {
                new: true,
                runValidators: true,
            }
        )
            .select("-embedding")
            .populate("personId", "name relationship");

        if (!memory) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        return res.status(200).json(memory);
    } catch (error) {
        console.error("Update memory error:", error.message);

        return res.status(500).json({
            message: "Failed to update memory.",
        });
    }
};

// Delete only a memory belonging to an authorized patient.
const deleteMemory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid memory ID.",
            });
        }

        const existingMemory = await Memory.findOne({
            _id: id,
            userId,
        });

        if (!existingMemory) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        const patient = await verifyPatient(
            existingMemory.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Memory not found.",
            });
        }

        await Memory.deleteOne({
            _id: id,
            userId,
            patientId: existingMemory.patientId,
        });

        return res.status(200).json({
            message: "Memory deleted successfully.",
        });
    } catch (error) {
        console.error("Delete memory error:", error.message);

        return res.status(500).json({
            message: "Failed to delete memory.",
        });
    }
};

// Search memories belonging to the selected patient.
const searchMemoryController = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { patientId, query, limit } = req.body;

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                message: "A non-empty query is required.",
            });
        }

        const parsedLimit = Number(limit ?? 5);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 20
        ) {
            return res.status(400).json({
                message: "Limit must be an integer between 1 and 20.",
            });
        }

        const normalizedQuery = query.trim();

        const results = await searchMemories(
            normalizedQuery,
            parsedLimit,
            userId,
            patientId
        );

        return res.status(200).json({
            query: normalizedQuery,
            count: results.length,
            results,
        });
    } catch (error) {
        console.error("Memory search error:", error.message);

        return res.status(500).json({
            message: "Memory search failed.",
        });
    }
};

// Answer questions using only the selected patient's memories.
async function askMemoryController(req, res) {
    try {
        const userId = req.user.userId;
        const { patientId, query, limit = 5 } = req.body;

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

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

        const memories = await searchMemories(
            normalizedQuery,
            parsedLimit,
            userId,
            patientId
        );

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