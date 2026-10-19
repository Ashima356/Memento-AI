const express = require("express");
const personRoutes = require("./routes/personRoutes");
const memoryRoutes = require("./routes/memoryRoutes");

const app = express();

// Middleware
app.use(express.json());

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

module.exports = app;