const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
    {
        personId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Person",
            required: true,
            index: true
        },

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

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: Date,
            default: null
        },

        tags: {
            type: [String],
            default: []
        },

        embedding: {
            type: [Number],
            default: []
        }
    },
    {
        timestamps: true
    }
);

memorySchema.index({
    userId: 1,
    patientId: 1,
    personId: 1
});

module.exports = mongoose.model("Memory", memorySchema);