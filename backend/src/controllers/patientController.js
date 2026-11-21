const mongoose = require("mongoose");
const Patient = require("../models/Patient");

// POST /api/patients
const createPatient = async (req, res) => {
  try {
    const { name, dateOfBirth, notes } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Patient name is required."
      });
    }

    const patient = await Patient.create({
      name: name.trim(),
      caregiverId: req.user.userId,
      dateOfBirth: dateOfBirth || null,
      notes: typeof notes === "string" ? notes : ""
    });

    return res.status(201).json(patient);
  } catch (error) {
    console.error("Create patient error:", error.message);
    return res.status(500).json({
      message: "Failed to create patient."
    });
  }
};

// GET /api/patients
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      caregiverId: req.user.userId
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: patients.length,
      patients
    });
  } catch (error) {
    console.error("Get patients error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve patients."
    });
  }
};

// GET /api/patients/:id
const getPatient = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid patient ID."
      });
    }

    const patient = await Patient.findOne({
      _id: req.params.id,
      caregiverId: req.user.userId
    });

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    return res.status(200).json(patient);
  } catch (error) {
    console.error("Get patient error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve patient."
    });
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatient
};
