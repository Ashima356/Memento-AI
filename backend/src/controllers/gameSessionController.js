const mongoose = require("mongoose");
const GameSession = require("../models/GameSession");
const Patient = require("../models/Patient");

const saveGameSession = async (req, res) => {
    try {
        const {
            patientId,
            gameType,
            score,
            totalQuestions,
            correctAnswers,
            difficulty,
            hintsUsed,
        } = req.body;

        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "Invalid patient ID.",
            });
        }

        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: userId,
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const validGames = [
            "face-name",
            "relationship",
            "memory-recall",
        ];

        if (!validGames.includes(gameType)) {
            return res.status(400).json({
                message: "Invalid game type.",
            });
        }

        if (
            !Number.isInteger(totalQuestions) ||
            totalQuestions < 1 ||
            !Number.isInteger(correctAnswers) ||
            correctAnswers < 0 ||
            correctAnswers > totalQuestions ||
            typeof score !== "number" ||
            !Number.isFinite(score) ||
            score < 0 ||
            (difficulty !== undefined &&
                !["easy", "medium", "hard"].includes(difficulty)) ||
            (hintsUsed !== undefined &&
                (!Number.isInteger(hintsUsed) || hintsUsed < 0))
        ) {
            return res.status(400).json({
                message: "Invalid game results.",
            });
        }

        const session = await GameSession.create({
            userId,
            patientId,
            gameType,
            score,
            totalQuestions,
            correctAnswers,
            difficulty,
            hintsUsed,
        });

        return res.status(201).json({
            message: "Game session saved successfully.",
            session,
        });
    } catch (error) {
        console.error("Save game session error:", error);
        return res.status(500).json({
            message: "Failed to save game session.",
        });
    }
};

// Get patient-specific game progress
const getGameProgress = async (req, res) => {
    try {
        const { patientId } = req.query;
        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "Invalid patient ID.",
            });
        }

        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: userId,
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const sessions = await GameSession.find({
            userId,
            patientId,
        })
            .sort({ createdAt: -1 })
            .lean();

        const totalSessions = sessions.length;

        const totalQuestions = sessions.reduce(
            (sum, session) => sum + session.totalQuestions,
            0
        );

        const correctAnswers = sessions.reduce(
            (sum, session) => sum + session.correctAnswers,
            0
        );

        const accuracy =
            totalQuestions > 0
                ? Math.round((correctAnswers / totalQuestions) * 100)
                : 0;

        const averageScore =
            totalSessions > 0
                ? Math.round(
                      sessions.reduce(
                          (sum, session) => sum + session.score,
                          0
                      ) / totalSessions
                  )
                : 0;

        return res.status(200).json({
            patientId,
            totalSessions,
            averageScore,
            accuracy,
            sessions,
        });
    } catch (error) {
        console.error("Get game progress error:", error);

        return res.status(500).json({
            message: "Failed to fetch game progress.",
        });
    }
};

module.exports = {
    saveGameSession,
    getGameProgress,
};