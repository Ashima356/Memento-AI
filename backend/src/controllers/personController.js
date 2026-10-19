const Person = require("../models/Person");

// Create a new person
const createPerson = async (req, res) => {
    try {
        const person = await Person.create(req.body);

        res.status(201).json(person);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Get all people
const getPeople = async (req, res) => {
    try {
        const people = await Person.find();

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
        const person = await Person.findById(req.params.id);

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
        const person = await Person.findByIdAndUpdate(
            req.params.id,
            req.body,
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
        const person = await Person.findByIdAndDelete(req.params.id);

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