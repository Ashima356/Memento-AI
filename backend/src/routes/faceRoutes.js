const express = require("express");
const multer = require("multer");
const Person = require("../models/Person");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (["image/jpeg", "image/png"].includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error("Only JPEG and PNG images are allowed"));
    }
});

const FACE_API = "http://127.0.0.1:8000";
const MATCH_THRESHOLD = 0.5;

router.use(protect);

async function generateFaceEmbedding(buffer, mimetype) {
    const form = new FormData();
    form.append(
        "image",
        new Blob([buffer], { type: mimetype }),
        "face.jpg"
    );

    const response = await fetch(`${FACE_API}/embed`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000)
    });

    const result = await response.json();

    if (!response.ok) {
        const error = new Error(
            typeof result.detail === "string"
                ? result.detail
                : "Face embedding failed"
        );
        error.status = response.status;
        throw error;
    }

    if (
        !Array.isArray(result.embedding) ||
        result.embedding.length !== 512 ||
        !result.embedding.every(Number.isFinite)
    ) {
        throw new Error("Invalid embedding returned by Face API");
    }

    return result.embedding;
}

// Register a face for an existing person
router.post("/register/:personId", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        const person = await Person.findOne({
            _id: req.params.personId,
            userId: req.user.userId
        });

        if (!person) {
            return res.status(404).json({ message: "Person not found" });
        }

        const embedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype
        );

        person.faceEmbedding = embedding;
        await person.save();

        res.json({
            message: "Face registered successfully",
            personId: person._id,
            name: person.name
        });
    } catch (error) {
        res.status(error.status === 400 ? 400 : 500).json({
            message: error.status === 400
                ? error.message
                : "Face registration failed"
        });
    }
});

// Identify a face among the logged-in user's people
router.post("/identify", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        const embedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype
        );

        const people = await Person.find({
            userId: req.user.userId
        }).select("+faceEmbedding");

        const knownFaces = {};

        for (const person of people) {
            if (
                Array.isArray(person.faceEmbedding) &&
                person.faceEmbedding.length === 512
            ) {
                knownFaces[String(person._id)] = person.faceEmbedding;
            }
        }

        if (Object.keys(knownFaces).length === 0) {
            return res.json({
                matched: false,
                person: null,
                message: "No registered faces found"
            });
        }

        const response = await fetch(`${FACE_API}/match`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                embedding,
                known_faces: knownFaces,
                threshold: MATCH_THRESHOLD
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error("Face matching service failed");
        }

        const result = await response.json();

        if (!result.matched) {
            return res.json({
                matched: false,
                person: null,
                similarity: result.similarity
            });
        }

        const person = people.find(
            p => String(p._id) === result.person_id
        );

        res.json({
            matched: true,
            person: person
                ? {
                    id: person._id,
                    name: person.name,
                    relationship: person.relationship,
                    profileImage: person.profileImage
                }
                : null,
            similarity: result.similarity
        });
    } catch (error) {
        res.status(error.status === 400 ? 400 : 500).json({
            message: error.status === 400
                ? error.message
                : "Face identification failed"
        });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: error.message });
    }

    if (error) {
        return res.status(400).json({ message: error.message });
    }

    next();
});

module.exports = router;