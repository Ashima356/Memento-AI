const mongoose = require("mongoose");

const personSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        relationship: {
            type: String,
            required: true,
            trim: true
        },

        notes: {
            type: String,
            default: ""
        },

        faceId: {
            type: String,
            default: "",
            select: false
        },

        // Sensitive biometric data must not appear
        // in normal database query results.
        faceEmbedding: {
            type: [Number],
            default: undefined,
            select: false,
            validate: {
                validator: function (value) {
                    return value === undefined ||
                        (
                            Array.isArray(value) &&
                            value.length === 512 &&
                            value.every(Number.isFinite)
                        );
                },
                message:
                    "Face embedding must contain 512 finite numbers"
            }
        },

        profileImage: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

// Efficient caregiver + patient scoped queries.
personSchema.index({ userId: 1, patientId: 1 });

// Never expose sensitive biometric fields in JSON responses.
personSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.faceEmbedding;
        delete ret.faceId;
        return ret;
    }
});

module.exports = mongoose.model("Person", personSchema);