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

        // Sensitive biometric data:
        // excluded from normal database queries
        faceEmbedding: {
            type: [Number],
            default: [],
            select: false
        },

        profileImage: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

// Efficient caregiver + patient scoped queries
personSchema.index({ userId: 1, patientId: 1 });

// Prevent sensitive biometric fields from appearing
// in JSON responses, including newly created documents
personSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.faceEmbedding;
        delete ret.faceId;
        return ret;
    }
});

module.exports = mongoose.model("Person", personSchema);