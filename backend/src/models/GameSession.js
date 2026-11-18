const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true,
        },

        gameType: {
            type: String,
            enum: ["face-name", "relationship", "memory-recall"],
            required: true,
        },

        score: {
            type: Number,
            required: true,
            min: 0,
        },

        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
        },

        correctAnswers: {
            type: Number,
            required: true,
            min: 0,
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "easy",
        },

        hintsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

gameSessionSchema.index({ userId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model("GameSession", gameSessionSchema);