const express = require("express");
const path = require("path");

// Import routes
const authRoutes = require("./routes/authRoutes");
const personRoutes = require("./routes/personRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const gamesRoutes = require("./routes/gamesRoutes");
const faceRoutes = require("./routes/faceRoutes");
const patientRoutes = require("./routes/patientRoutes");

const app = express();

// Middleware
app.use(express.json());

// Serve public static files
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

// Patient management routes
app.use("/api/patients", patientRoutes);

// Family member routes
app.use("/api/persons", personRoutes);

// Memory routes
app.use("/api/memories", memoryRoutes);

// Cognitive games routes
app.use("/api/games", gamesRoutes);

// Face Recognition routes
app.use("/api/faces", faceRoutes);

module.exports = app;