const express = require("express");

const protect = require("../middleware/authMiddleware");

const { getGamesData } = require("../controllers/gamesController");

const {
    saveGameSession,
    getGameProgress,
} = require("../controllers/gameSessionController");

const router = express.Router();

// Require JWT authentication for all game routes.
router.use(protect);

// Get patient-specific family and memory data for games.
router.get("/data", getGamesData);

// Get patient-specific game progress for the dashboard.
router.get("/progress", getGameProgress);

// Save a completed cognitive game session.
router.post("/sessions", saveGameSession);

module.exports = router;