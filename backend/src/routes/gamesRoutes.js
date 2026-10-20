
const express = require("express");
const { getGamesData } = require("../controllers/gamesController");

const router = express.Router();

router.get("/data", getGamesData);

module.exports = router;
