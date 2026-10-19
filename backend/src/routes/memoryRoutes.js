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

const router = express.Router();

router.post("/", createMemory);
router.post("/search", searchMemoryController);
router.post("/ask", askMemoryController);

router.get("/", getMemories);

router.get("/:id", getMemory);
router.put("/:id", updateMemory);
router.delete("/:id", deleteMemory);


module.exports = router;