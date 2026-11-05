require("dotenv").config();

const mongoose = require("mongoose");
const Person = require("../src/models/Person");
const Memory = require("../src/models/Memory");

const DEVELOPMENT_USER_ID = "6aece77a6d216763cb5b6f17";

const previewMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Find people that do not have an owner
    const people = await Person.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).select("_id name relationship");

    const personIds = people.map(person => person._id);

    // Find memories belonging to those people that have no owner
    const memories = await Memory.find({
      personId: { $in: personIds },
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).select("_id title personId");

    console.log("\n========== MIGRATION PREVIEW ==========");
    console.log("Development account:", DEVELOPMENT_USER_ID);

    console.log("\nPeople to be assigned:", people.length);
    people.forEach(person => {
      console.log(`- ${person.name} (${person.relationship})`);
    });

    console.log("\nMemories to be assigned:", memories.length);
    memories.forEach(memory => {
      console.log(`- ${memory.title}`);
    });

    console.log("\nNo database records have been modified.");
    console.log("=======================================\n");

  } catch (error) {
    console.error("Preview failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

previewMigration();