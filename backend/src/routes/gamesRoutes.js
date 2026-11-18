const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getGamesData } = require("../controllers/gamesController");

const {
    saveGameSession,
    getGameProgress,
} = require("../controllers/gameSessionController");

const router = express.Router();

// Require JWT authentication for all game routes
router.use(protect);

// Get patient-specific data for games
router.get("/data", getGamesData);

// Get patient-specific game progress
router.get("/progress", getGameProgress);

// Save completed game session
router.post("/sessions", saveGameSession);

module.exports = router;