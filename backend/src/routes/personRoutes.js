const express = require("express");

const {
    createPerson,
    getPeople,
    getPerson,
    updatePerson,
    deletePerson,
} = require("../controllers/personController");

const {
    uploadPersonImage,
} = require("../controllers/personImageController");

const upload = require("../middleware/uploadMiddleware");
const uploadErrorHandler = require("../middleware/uploadErrorHandler");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Require JWT authentication for all person routes.
router.use(protect);

// Create and list familiar people.
router.post("/", createPerson);
router.get("/", getPeople);

// Upload a familiar person's profile image.
router.post(
    "/:id/image",
    upload,
    uploadErrorHandler,
    uploadPersonImage
);

// Get, update and delete a familiar person.
router.get("/:id", getPerson);
router.put("/:id", updatePerson);
router.delete("/:id", deletePerson);

module.exports = router;