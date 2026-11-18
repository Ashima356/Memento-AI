const express = require("express");
const path = require("path");

// Import routes
const personRoutes = require("./routes/personRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const gamesRoutes = require("./routes/gamesRoutes");
const patientRoutes = require("./routes/patientRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(express.json());

// Serve static images
app.use(
  express.static(path.join(__dirname, "..", "public"))
);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Memento-AI backend is running!"
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Existing API routes
app.use("/api/persons", personRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/games", gamesRoutes);

// JWT-protected patient routes
app.use("/api/patients", patientRoutes);

module.exports = app;