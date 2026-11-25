const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Private directory, outside Express public/static files.
const uploadDirectory = path.join(
    __dirname,
    "../../private/uploads/people"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (req, file, callback) => {
        const allowedExtensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        };

        const extension = allowedExtensions[file.mimetype];

        callback(
            null,
            `${crypto.randomUUID()}${extension}`
        );
    }
});

const fileFilter = (req, file, callback) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return callback(
            new Error("Only JPEG, PNG and WebP images are allowed.")
        );
    }

    callback(null, true);
};

const uploadPersonImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
}).single("profileImage");

module.exports = uploadPersonImage;