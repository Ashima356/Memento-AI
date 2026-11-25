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

// Require JWT authentication for all memory routes.
router.use(protect);

// Create a memory.
router.post("/", createMemory);

// Search patient-specific memories.
router.post("/search", searchMemoryController);

// Ask questions using stored memories.
router.post("/ask", askMemoryController);

// Get memories belonging to the selected patient.
router.get("/", getMemories);

// Get, update and delete an individual memory.
router.get("/:id", getMemory);
router.put("/:id", updateMemory);
router.delete("/:id", deleteMemory);

module.exports = router;