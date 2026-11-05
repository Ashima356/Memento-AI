
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Person = require("../src/models/Person");
const Memory = require("../src/models/Memory");

const DEVELOPMENT_USER_ID = "6aece77a6d216763cb5b6f17";

const migrateOwnership = async () => {
  let session;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    const user = await User.findById(DEVELOPMENT_USER_ID);

    if (!user) {
      throw new Error("Development account not found.");
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      // Find people that have not yet been assigned an owner.
      const people = await Person.find({
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      })
        .select("_id")
        .session(session);

      if (people.length === 0) {
        throw new Error(
          "No unassigned people found. Migration may already be completed."
        );
      }

      const personIds = people.map(person => person._id);

      // Assign the development account as owner of these people.
      const peopleResult = await Person.updateMany(
        {
          _id: { $in: personIds },
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { $set: { userId: user._id } },
        { session }
      );

      // Assign ownership to unassigned memories belonging to those people.
      const memoriesResult = await Memory.updateMany(
        {
          personId: { $in: personIds },
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { $set: { userId: user._id } },
        { session }
      );

      console.log("\n========== MIGRATION RESULT ==========");
      console.log("Account:", user.name);
      console.log("People assigned:", peopleResult.modifiedCount);
      console.log("Memories assigned:", memoriesResult.modifiedCount);
      console.log("======================================\n");
    });

    console.log("Ownership migration completed successfully.");

  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;

  } finally {
    if (session) {
      await session.endSession();
    }

    await mongoose.disconnect();
  }
};

migrateOwnership();
