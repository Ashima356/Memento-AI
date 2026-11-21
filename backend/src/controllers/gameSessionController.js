const mongoose = require("mongoose");
const GameSession = require("../models/GameSession");
const Patient = require("../models/Patient");

const VALID_GAMES = [
    "face-name",
    "relationship",
    "memory-recall",
    "memory-matching",
];

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

// Save a completed game session
const saveGameSession = async (req, res) => {
    try {
        const {
            patientId,
            gameType,
            score,
            totalQuestions,
            correctAnswers,
            difficulty,
            finalDifficulty,
            hintsUsed,
            totalAttempts,
            averageResponseTime,
            completionRate,
        } = req.body;

        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "Invalid patient ID.",
            });
        }

        // Verify caregiver owns the patient
        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: userId,
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        if (!VALID_GAMES.includes(gameType)) {
            return res.status(400).json({
                message: "Invalid game type.",
            });
        }

        // Validate required game results
        if (
            !Number.isInteger(totalQuestions) ||
            totalQuestions < 1 ||
            !Number.isInteger(correctAnswers) ||
            correctAnswers < 0 ||
            correctAnswers > totalQuestions ||
            typeof score !== "number" ||
            !Number.isFinite(score) ||
            score < 0 ||
            score > 100
        ) {
            return res.status(400).json({
                message: "Invalid game results.",
            });
        }

        // Validate optional difficulty values
        if (
            (difficulty !== undefined &&
                !VALID_DIFFICULTIES.includes(difficulty)) ||
            (finalDifficulty !== undefined &&
                !VALID_DIFFICULTIES.includes(finalDifficulty))
        ) {
            return res.status(400).json({
                message: "Invalid game difficulty.",
            });
        }

        // Validate optional performance metrics
        if (
            (hintsUsed !== undefined &&
                (!Number.isInteger(hintsUsed) || hintsUsed < 0)) ||
            (totalAttempts !== undefined &&
                (!Number.isInteger(totalAttempts) ||
                    totalAttempts < 0)) ||
            (averageResponseTime !== undefined &&
                (typeof averageResponseTime !== "number" ||
                    !Number.isFinite(averageResponseTime) ||
                    averageResponseTime < 0)) ||
            (completionRate !== undefined &&
                (typeof completionRate !== "number" ||
                    !Number.isFinite(completionRate) ||
                    completionRate < 0 ||
                    completionRate > 100))
        ) {
            return res.status(400).json({
                message: "Invalid performance metrics.",
            });
        }

        // Save patient-specific game performance
        const session = await GameSession.create({
            userId,
            patientId,
            gameType,
            score,
            totalQuestions,
            correctAnswers,
            difficulty,
            finalDifficulty,
            hintsUsed,
            totalAttempts,
            averageResponseTime,
            completionRate,
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

        // Verify caregiver owns the patient
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
                ? Math.round(
                      (correctAnswers / totalQuestions) * 100
                  )
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

        // Older sessions may not contain these optional fields
        const sessionsWithResponseTime = sessions.filter(
            (session) =>
                typeof session.averageResponseTime === "number" &&
                Number.isFinite(session.averageResponseTime)
        );

        const averageResponseTime =
            sessionsWithResponseTime.length > 0
                ? Number(
                      (
                          sessionsWithResponseTime.reduce(
                              (sum, session) =>
                                  sum + session.averageResponseTime,
                              0
                          ) / sessionsWithResponseTime.length
                      ).toFixed(2)
                  )
                : null;

        const totalHintsUsed = sessions.reduce(
            (sum, session) => sum + (session.hintsUsed || 0),
            0
        );

        const totalAttempts = sessions.reduce(
            (sum, session) => sum + (session.totalAttempts || 0),
            0
        );

        return res.status(200).json({
            patientId,
            totalSessions,
            averageScore,
            accuracy,
            averageResponseTime,
            totalHintsUsed,
            totalAttempts,
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