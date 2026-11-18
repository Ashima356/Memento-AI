const multer = require("multer");

const uploadErrorHandler = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                message: "Image exceeds the 5 MB limit"
            });
        }

        return res.status(400).json({
            message: "Invalid image upload"
        });
    }

    if (error.message === "Only JPEG, PNG and WebP images are allowed.") {
        return res.status(400).json({
            message: "Only JPEG, PNG and WebP images are allowed"
        });
    }

    return next(error);
};

module.exports = uploadErrorHandler;