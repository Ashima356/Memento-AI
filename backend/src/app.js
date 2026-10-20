
const express = require("express");
const path = require("path");

const personRoutes = require("./routes/personRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const gamesRoutes = require("./routes/gamesRoutes");

const app = express();

// Middleware
app.use(express.json());

// Serve static images from backend/public
app.use(
    express.static(path.join(__dirname, "..", "public"))
);

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "Memento-AI backend is running!"
    });
});

// Person routes
app.use("/api/persons", personRoutes);

// Memory routes
app.use("/api/memories", memoryRoutes);

// Games routes
app.use("/api/games", gamesRoutes);

module.exports = app;
