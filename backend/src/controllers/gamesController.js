
const Person = require("../models/Person");
const Memory = require("../models/Memory");

// GET /api/games/data
const getGamesData = async (req, res) => {
    try {
        const people = await Person.find()
            .select("name relationship notes")
            .lean();

        const memories = await Memory.find()
            .select("personId title description date tags")
            .lean();

        const memoriesByPerson = new Map();

        for (const memory of memories) {
            const personId = memory.personId.toString();

            if (!memoriesByPerson.has(personId)) {
                memoriesByPerson.set(personId, []);
            }

            memoriesByPerson.get(personId).push({
                id: memory._id,
                title: memory.title,
                description: memory.description,
                date: memory.date ?? null,
                tags: memory.tags ?? [],
            });
        }

        const result = people.map((person) => ({
            id: person._id,
            name: person.name,
            relationship: person.relationship,
            notes: person.notes ?? "",
            memories: memoriesByPerson.get(
                person._id.toString()
            ) ?? [],
        }));

        return res.status(200).json({
            count: result.length,
            people: result,
        });
    } catch (error) {
        console.error("Games data error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve games data.",
        });
    }
};

module.exports = { getGamesData };
