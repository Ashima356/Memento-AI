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
            enum: [
                "face-name",
                "relationship",
                "memory-recall",
                "memory-matching",
            ],
            required: true,
        },

        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },

        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
        },

        // First-attempt correct answers
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

        finalDifficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: undefined,
        },

        hintsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalAttempts: {
            type: Number,
            min: 0,
            default: undefined,
        },

        averageResponseTime: {
            type: Number,
            min: 0,
            default: undefined,
        },

        completionRate: {
            type: Number,
            min: 0,
            max: 100,
            default: undefined,
        },
    },
    { timestamps: true }
);

gameSessionSchema.index({
    userId: 1,
    patientId: 1,
    createdAt: -1,
});

module.exports = mongoose.model("GameSession", gameSessionSchema);