const express = require("express");
const { getGamesData } = require("../controllers/gamesController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Protect games data
router.use(protect);

router.get("/data", getGamesData);

module.exports = router;