const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");

const Person = require("../models/Person");
const Patient = require("../models/Patient");

const validatePersonImage = require("../services/validatePersonImage");
const generateFaceEmbedding = require("../services/generateFaceEmbedding");

const uploadPersonImage = async (req, res) => {
    const uploadedPath = req.file?.path;
    let saved = false;

    try {
        if (!uploadedPath) {
            return res.status(400).json({
                message: "Profile image is required"
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid person ID"
            });
        }

        const person = await Person.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!person) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        const patient = await Patient.findOne({
            _id: person.patientId,
            caregiverId: req.user.userId
        });

        if (!patient) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        // Validate actual image contents and MIME type
        const imageBuffer = await validatePersonImage(
            uploadedPath,
            req.file.mimetype
        );

        // Generate a 512-dimensional face embedding
        const embedding = await generateFaceEmbedding(
            imageBuffer,
            req.file.mimetype
        );

        const previousImage = person.profileImage;

        const updatedPerson = await Person.findOneAndUpdate(
            {
                _id: person._id,
                userId: req.user.userId,
                patientId: patient._id
            },
            {
                $set: {
                    profileImage: path.basename(uploadedPath),
                    faceEmbedding: embedding
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedPerson) {
            return res.status(404).json({
                message: "Person not found"
            });
        }

        saved = true;

        // Delete the previous private image after successful update
        if (previousImage) {
            const privateDirectory = path.dirname(uploadedPath);
            const previousFilename = path.basename(previousImage);

            if (
                previousFilename === previousImage &&
                previousFilename !== path.basename(uploadedPath)
            ) {
                await fs.unlink(
                    path.join(privateDirectory, previousFilename)
                ).catch(() => {});
            }
        }

        return res.status(200).json({
            message: "Profile image and face embedding updated",
            personId: updatedPerson._id,
            profileImage: updatedPerson.profileImage,
            embeddingDimensions: embedding.length
        });

    } catch (error) {

        // Invalid or disguised image = client error
        if (
            error.message ===
            "Invalid image format or MIME type mismatch."
        ) {
            return res.status(400).json({
                message: "Invalid image format or MIME type mismatch"
            });
        }

        // Unexpected processing or server error
        console.error("Upload person image error:", error.message);

        return res.status(500).json({
            message: "Failed to process profile image"
        });

    } finally {

        // Remove uploaded file if processing did not succeed
        if (uploadedPath && !saved) {
            await fs.unlink(uploadedPath).catch(() => {});
        }
    }
};

module.exports = { uploadPersonImage };