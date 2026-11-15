
const assert = require("node:assert/strict");

const BASE_URL = "http://localhost:5000/api/memories/ask";

async function ask(query, limit = 5) {
    return fetch(BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit }),
    });
}

async function runTests() {
    let passed = 0;

    async function test(name, fn) {
        try {
            await fn();
            passed++;
            console.log(`PASS: ${name}`);
        } catch (error) {
            console.error(`FAIL: ${name}`);
            console.error(error.message);
        }
    }

    await test("Rejects an empty query", async () => {
        const response = await ask("   ");
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(
            body.message,
            "A non-empty query is required."
        );
    });

    await test("Returns no sources for missing information", async () => {
        const response = await ask(
            "What is my favourite subject at university?"
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.memories_used, 0);
        assert.deepEqual(body.sources, []);
    });

    await test("Retrieves relevant Goa memories", async () => {
        const response = await ask(
            "Where did we go on our family trip?"
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.ok(body.memories_used > 0);
        assert.ok(body.sources.length > 0);

        const sourceText = body.sources
            .map((source) => source.title)
            .join(" ")
            .toLowerCase();

        assert.ok(sourceText.includes("goa"));
    });

    console.log(`\n${passed}/3 tests passed.`);

    if (passed !== 3) {
        process.exitCode = 1;
    }
}

runTests().catch((error) => {
    console.error("Test runner failed:", error.message);
    process.exitCode = 1;
});
