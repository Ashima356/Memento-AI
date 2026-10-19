const express = require("express");

const {
    createPerson,
    getPeople,
    getPerson,
    updatePerson,
    deletePerson
} = require("../controllers/personController");

const router = express.Router();

// /api/persons
router.post("/", createPerson);
router.get("/", getPeople);

// /api/persons/:id
router.get("/:id", getPerson);
router.put("/:id", updatePerson);
router.delete("/:id", deletePerson);

module.exports = router;