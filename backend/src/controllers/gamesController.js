const mongoose = require("mongoose");

const Patient = require("../models/Patient");
const Person = require("../models/Person");
const Memory = require("../models/Memory");

// Get patient-specific data for memory games
const getGamesData = async (req, res) => {
    try {
        const { patientId } = req.query;
        const userId = req.user.userId;

        // Validate patient ID
        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "Invalid patient ID.",
            });
        }

        // Verify caregiver owns this patient
        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: userId,
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        // Fetch patient-specific people and memories
        const persons = await Person.find({
            userId,
            patientId,
        }).lean();

        const memories = await Memory.find({
            userId,
            patientId,
        }).lean();

        // Attach related memories to each person
        const gamesData = persons.map((person) => ({
            ...person,
            memories: memories.filter((memory) =>
                memory.personId?.toString() === person._id.toString()
            ),
        }));

        return res.status(200).json({
            patientId,
            persons: gamesData,
        });
    } catch (error) {
        console.error("Get games data error:", error);

        return res.status(500).json({
            message: "Failed to fetch games data.",
        });
    }
};

module.exports = { getGamesData };