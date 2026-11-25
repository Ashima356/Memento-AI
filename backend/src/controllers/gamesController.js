const mongoose = require("mongoose");

const Patient = require("../models/Patient");
const Person = require("../models/Person");
const Memory = require("../models/Memory");

// GET /api/games/data?patientId=<patient-id>
const getGamesData = async (req, res) => {
    try {
        const { patientId } = req.query;
        const userId = req.user.userId;

        // A valid patient ID is required to prevent
        // mixing data belonging to different patients.
        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "A valid patient ID is required.",
            });
        }

        // Only the patient's caregiver can access game data.
        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: userId,
        }).lean();

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        // Fetch only records owned by this caregiver
        // and associated with the selected patient.
        const [persons, memories] = await Promise.all([
            Person.find({
                userId,
                patientId,
            })
                .select("name relationship notes profileImage")
                .lean(),

            Memory.find({
                userId,
                patientId,
            })
                .select("personId title description date tags")
                .lean(),
        ]);

        // Group memories by person for efficient lookup.
        const memoriesByPerson = new Map();

        for (const memory of memories) {
            if (!memory.personId) {
                continue;
            }

            const personId = memory.personId.toString();

            if (!memoriesByPerson.has(personId)) {
                memoriesByPerson.set(personId, []);
            }

            memoriesByPerson.get(personId).push({
                id: memory._id,
                _id: memory._id,
                personId: memory.personId,
                title: memory.title,
                description: memory.description,
                date: memory.date ?? null,
                tags: memory.tags ?? [],
            });
        }

        // Support the existing Face-Name game format
        // and the newer Memory Matching game format.
        const people = persons.map((person) => {
            const personMemories =
                memoriesByPerson.get(person._id.toString()) ?? [];

            return {
                id: person._id,
                _id: person._id,
                name: person.name,
                relationship: person.relationship,
                notes: person.notes ?? "",
                profileImage: person.profileImage ?? null,
                memories: personMemories,
            };
        });

        return res.status(200).json({
            patientId,
            count: people.length,
            people,
            persons: people,
        });

    } catch (error) {
        console.error("Get games data error:", error);

        return res.status(500).json({
            message: "Failed to fetch games data.",
        });
    }
};

module.exports = { getGamesData };