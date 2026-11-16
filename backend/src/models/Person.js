const mongoose = require("mongoose");

const personSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
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
            default: null
        },

        faceEmbedding: {
            type: [Number],
            default: undefined,
            select: false,
            validate: {
                validator: function (value) {
                    return value === undefined ||
                        (value.length === 512 &&
                         value.every(Number.isFinite));
                },
                message: "Face embedding must contain 512 finite numbers"
            }
        },

        profileImage: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Person", personSchema);