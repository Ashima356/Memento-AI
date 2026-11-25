const mongoose = require("mongoose");

const Person = require("../models/Person");
const Patient = require("../models/Patient");

// Verify that the patient belongs to the logged-in caregiver.
const verifyPatient = async (patientId, userId) => {
    if (
        !mongoose.isValidObjectId(patientId) ||
        !mongoose.isValidObjectId(userId)
    ) {
        return null;
    }

    return Patient.findOne({
        _id: patientId,
        caregiverId: userId,
    });
};

// Create a familiar person for an authorized patient.
const createPerson = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            name,
            relationship,
            notes,
            faceId,
            patientId,
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof relationship !== "string" ||
            !relationship.trim()
        ) {
            return res.status(400).json({
                message: "Name and relationship are required.",
            });
        }

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message: "Valid patientId is required.",
            });
        }

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const person = await Person.create({
            name: name.trim(),
            relationship: relationship.trim(),
            notes,
            faceId,
            patientId: patient._id,
            userId,
        });

        return res.status(201).json(person);
    } catch (error) {
        console.error("Create person error:", error.message);

        return res.status(500).json({
            message: "Failed to create person.",
        });
    }
};

// Get familiar people belonging to one authorized patient.
const getPeople = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { patientId } = req.query;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                message:
                    "Valid patientId query parameter is required.",
            });
        }

        const patient = await verifyPatient(patientId, userId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found.",
            });
        }

        const people = await Person.find({
            userId,
            patientId: patient._id,
        });

        return res.status(200).json(people);
    } catch (error) {
        console.error("Get people error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve people.",
        });
    }
};

// Get one familiar person after verifying patient ownership.
const getPerson = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid person ID.",
            });
        }

        const person = await Person.findOne({
            _id: id,
            userId,
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        const patient = await verifyPatient(
            person.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        return res.status(200).json(person);
    } catch (error) {
        console.error("Get person error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve person.",
        });
    }
};

// Update a familiar person without changing ownership or image data.
const updatePerson = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid person ID.",
            });
        }

        const existingPerson = await Person.findOne({
            _id: id,
            userId,
        });

        if (!existingPerson) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        const patient = await verifyPatient(
            existingPerson.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        const {
            name,
            relationship,
            notes,
            faceId,
        } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Valid name is required.",
                });
            }

            updates.name = name.trim();
        }

        if (relationship !== undefined) {
            if (
                typeof relationship !== "string" ||
                !relationship.trim()
            ) {
                return res.status(400).json({
                    message: "Valid relationship is required.",
                });
            }

            updates.relationship = relationship.trim();
        }

        if (notes !== undefined) {
            updates.notes = notes;
        }

        if (faceId !== undefined) {
            updates.faceId = faceId;
        }

        // userId, patientId, profileImage and faceEmbedding
        // cannot be modified through this endpoint.
        const person = await Person.findOneAndUpdate(
            {
                _id: id,
                userId,
                patientId: patient._id,
            },
            { $set: updates },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!person) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        return res.status(200).json(person);
    } catch (error) {
        console.error("Update person error:", error.message);

        return res.status(500).json({
            message: "Failed to update person.",
        });
    }
};

// Delete a familiar person belonging to an authorized patient.
const deletePerson = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid person ID.",
            });
        }

        const existingPerson = await Person.findOne({
            _id: id,
            userId,
        });

        if (!existingPerson) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        const patient = await verifyPatient(
            existingPerson.patientId,
            userId
        );

        if (!patient) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        const person = await Person.findOneAndDelete({
            _id: id,
            userId,
            patientId: patient._id,
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found.",
            });
        }

        return res.status(200).json({
            message: "Person deleted successfully.",
        });
    } catch (error) {
        console.error("Delete person error:", error.message);

        return res.status(500).json({
            message: "Failed to delete person.",
        });
    }
};

module.exports = {
    createPerson,
    getPeople,
    getPerson,
    updatePerson,
    deletePerson,
};