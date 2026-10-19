const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
    {
        personId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Person",
            required: true
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

module.exports = mongoose.model("Memory", memorySchema);