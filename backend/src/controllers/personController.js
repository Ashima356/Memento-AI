const Person = require("../models/Person");

// Create a new person
const createPerson = async (req, res) => {
    try {
        const { name, relationship, notes, faceId, profileImage } = req.body;

        if (!name || !relationship) {
            return res.status(400).json({
                message: "Name and relationship are required"
            });
        }

        const person = await Person.create({
            name,
            relationship,
            notes,
            faceId,
            profileImage,
            userId: req.user.userId
        });

        res.status(201).json(person);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Get all people belonging to the logged-in user
const getPeople = async (req, res) => {
    try {
        const people = await Person.find({
            userId: req.user.userId
        });

        res.status(200).json(people);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// Get one person by ID
const getPerson = async (req, res) => {
    try {
        const person = await Person.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        res.status(200).json(person);

    } catch (error) {
        res.status(400).json({
            message: "Invalid person ID"
        });
    }
};

// Update a person
const updatePerson = async (req, res) => {
    try {
        const { name, relationship, notes, faceId, profileImage } = req.body;

        const updates = {};

        if (name !== undefined) updates.name = name;
        if (relationship !== undefined) updates.relationship = relationship;
        if (notes !== undefined) updates.notes = notes;
        if (faceId !== undefined) updates.faceId = faceId;
        if (profileImage !== undefined) updates.profileImage = profileImage;

        const person = await Person.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.userId
            },
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        res.status(200).json(person);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Delete a person
const deletePerson = async (req, res) => {
    try {
        const person = await Person.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        res.status(200).json({
            message: "Person deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            message: "Invalid person ID"
        });
    }
};

module.exports = {
    createPerson,
    getPeople,
    getPerson,
    updatePerson,
    deletePerson
};