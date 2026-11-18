const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
    createMemory,
    getMemories,
    getMemory,
    updateMemory,
    deleteMemory,
    searchMemoryController,
    askMemoryController,
} = require("../controllers/memoryController");

const router = express.Router();

// Protect all memory routes with JWT authentication
router.use(protect);

// Create a new memory
router.post("/", createMemory);

// Search memories
router.post("/search", searchMemoryController);

// Ask questions using stored memories
router.post("/ask", askMemoryController);

// Get all memories
router.get("/", getMemories);

// Get a single memory
router.get("/:id", getMemory);

// Update a memory
router.put("/:id", updateMemory);

// Delete a memory
router.delete("/:id", deleteMemory);

module.exports = router;