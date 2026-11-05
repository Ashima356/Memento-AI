const express = require("express");

const {
    createMemory,
    getMemories,
    getMemory,
    updateMemory,
    deleteMemory,
    searchMemoryController,
    askMemoryController,
} = require("../controllers/memoryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all memory routes
router.use(protect);

// Create, search and ask
router.post("/", createMemory);
router.post("/search", searchMemoryController);
router.post("/ask", askMemoryController);

// Get all memories
router.get("/", getMemories);

// Individual memory operations
router.get("/:id", getMemory);
router.put("/:id", updateMemory);
router.delete("/:id", deleteMemory);

module.exports = router;