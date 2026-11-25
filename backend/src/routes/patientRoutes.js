const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  createPatient,
  getPatients,
  getPatient
} = require("../controllers/patientController");

const router = express.Router();

// All patient routes require JWT authentication.
router.use(protect);

// Create a patient and list caregiver's patients.
router.post("/", createPatient);
router.get("/", getPatients);

// Get one patient owned by the logged-in caregiver.
router.get("/:id", getPatient);

module.exports = router;